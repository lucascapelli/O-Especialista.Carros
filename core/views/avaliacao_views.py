# core/views/avaliacao_views.py
import json
import logging
import hashlib
import datetime
from django.contrib.humanize.templatetags.humanize import naturaltime
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_POST, require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.core.paginator import Paginator
from django.db.models import Q, Avg, Count, F, Window
from django.db.models.functions import RowNumber
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.conf import settings

# CORREÇÃO: Importe corretamente
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited

from core.models import Produto, Avaliacao, MidiaAvaliacao, AvaliacaoLike, AvaliacaoUtil, DenunciaAvaliacao
from core.forms import AvaliacaoForm, MidiaAvaliacaoForm

logger = logging.getLogger('core.avaliacoes')

def rate_limit_exceeded(request, exception):
    """Handler para rate limit exceeded"""
    return JsonResponse({
        'error': 'Rate limit exceeded',
        'retry_after': getattr(exception, 'retry_after', 60)
    }, status=429)

@login_required
@ratelimit(key='user', rate=settings.AVALIACOES_CONFIG['RATE_LIMITS']['avaliacao_create'], method='POST', block=True)  # CORRIGIDO: ratelimit, não ratelimit_decorator
@ratelimit(key='ip', rate='10/hour', method='POST', block=True)  # CORRIGIDO: ratelimit, não ratelimit_decorator
def criar_avaliacao(request, produto_id):
    """Cria avaliação com transaction.atomic()"""
    produto = get_object_or_404(Produto, id=produto_id)
    
    # Verifica se já avaliou (UniqueConstraint garante, mas verifica antes)
    if Avaliacao.objects.por_produto_usuario(produto_id, request.user.id):
        messages.info(request, "Você já avaliou este produto!")
        return redirect('detalhes_produto', produto_id=produto_id)
    
    if request.method == 'POST':
        form = AvaliacaoForm(request.POST)
        midias_forms = []
        
        # Processa múltiplos arquivos (limite configurável)
        files = request.FILES.getlist('midias')
        if len(files) > settings.AVALIACOES_CONFIG['MAX_MIDIAS_PER_AVALIACAO']:
            messages.error(request, f"Máximo de {settings.AVALIACOES_CONFIG['MAX_MIDIAS_PER_AVALIACAO']} mídias por avaliação.")
            return redirect('detalhes_produto', produto_id=produto_id)
        
        for arquivo in files:
            if arquivo.size > 0:
                midia_form = MidiaAvaliacaoForm(
                    {'legenda': ''}, 
                    {'arquivo': arquivo}
                )
                if midia_form.is_valid():
                    midias_forms.append(midia_form)
                else:
                    for error in midia_form.errors.get('arquivo', []):
                        messages.error(request, f"Erro no arquivo: {error}")
        
        if form.is_valid() and all(mf.is_valid() for mf in midias_forms):
            try:
                with transaction.atomic():
                    # Cria avaliação
                    avaliacao = form.save(commit=False)
                    avaliacao.produto = produto
                    avaliacao.usuario = request.user
                    avaliacao.ip_address = request.META.get('REMOTE_ADDR')
                    avaliacao.user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
                    
                    # Política de publicação (post-moderation)
                    if settings.AVALIACOES_CONFIG['MODERACAO_OBRIGATORIA']:
                        avaliacao.status = 'pendente'
                    else:
                        avaliacao.status = 'aprovado'
                        avaliacao.publicado_em = timezone.now()
                    
                    avaliacao.save()
                    
                    # Cria mídias dentro da mesma transação
                    for midia_form in midias_forms:
                        midia = midia_form.save(commit=False)
                        midia.avaliacao = avaliacao
                        midia.aprovado = not settings.AVALIACOES_CONFIG['MODERACAO_OBRIGATORIA']
                        midia.save()
                        
                        # Dispara task de processamento em background
                        from core.tasks.avaliacao_tasks import processar_midia_avaliacao
                        processar_midia_avaliacao.delay(midia.id)
                    
                    # Limpa cache de estatísticas do produto
                    cache.delete_many([
                        f'produto_{produto.id}_media_avaliacoes',
                        f'produto_{produto.id}_total_avaliacoes',
                        f'produto_{produto.id}_distribuicao_avaliacoes',
                        f'produto_{produto.id}_percentual_recomendacao',
                    ])
                    
                    # Dispara task de moderação em background
                    from core.tasks.avaliacao_tasks import processar_moderacao_avaliacao
                    processar_moderacao_avaliacao.delay(avaliacao.id)
                    
                    # Log de métrica
                    import logging
                    metrics_logger = logging.getLogger('metrics')
                    metrics_logger.info(f'avaliacao_criada produto={produto.id} usuario={request.user.id}')
                    
                    messages.success(request, 
                        "Avaliação enviada com sucesso!" if not settings.AVALIACOES_CONFIG['MODERACAO_OBRIGATORIA']
                        else "Avaliação enviada para moderação!"
                    )
                    return redirect('detalhes_produto', produto_id=produto_id)
                    
            except Exception as e:
                logger.error(f"Erro ao criar avaliação: {str(e)}", exc_info=True)
                messages.error(request, "Erro ao salvar avaliação. Tente novamente.")
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
    
    else:
        form = AvaliacaoForm()
    
    context = {
        'produto': produto,
        'form': form,
    }
    return render(request, 'core/front-end/avaliacao_form.html', context)

@login_required
@require_http_methods(["DELETE"])
def excluir_minha_avaliacao(request, avaliacao_id):
    """Endpoint LGPD para usuário excluir própria avaliação"""
    avaliacao = get_object_or_404(Avaliacao, id=avaliacao_id, usuario=request.user)
    
    try:
        with transaction.atomic():
            # Soft delete para conformidade
            avaliacao.delete_soft("Removido pelo usuário (LGPD)")
            
            # Limpa cache
            cache.delete_many([
                f'produto_{avaliacao.produto.id}_media_avaliacoes',
                f'produto_{avaliacao.produto.id}_total_avaliacoes',
                f'produto_{avaliacao.produto.id}_distribuicao_avaliacoes',
                f'produto_{avaliacao.produto.id}_percentual_recomendacao',
            ])
            
            logger.info(f"Avaliação {avaliacao_id} removida por {request.user.email} (LGPD)")
            
            return JsonResponse({'success': True, 'message': 'Avaliação removida.'})
    except Exception as e:
        logger.error(f"Erro ao excluir avaliação {avaliacao_id}: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Erro ao remover avaliação.'}, status=500)

@require_POST
@login_required
@ratelimit(key='user', rate=settings.AVALIACOES_CONFIG['RATE_LIMITS']['like_action'], method='POST', block=True)  # CORRIGIDO: ratelimit, não ratelimit_decorator
def like_avaliacao(request, avaliacao_id):
    """Sistema de likes com debounce e proteção contra farming"""
    avaliacao = get_object_or_404(Avaliacao, id=avaliacao_id, status='aprovado')
    tipo = request.POST.get('tipo', 'like')
    
    if tipo not in ['like', 'dislike']:
        return JsonResponse({'error': 'Tipo inválido'}, status=400)
    
    # Debounce: verifica se já interagiu recentemente
    debounce_key = f"like_debounce_{request.user.id}_{avaliacao_id}"
    if cache.get(debounce_key):
        return JsonResponse({'error': 'Aguarde antes de interagir novamente'}, status=429)
    
    try:
        with transaction.atomic():
            # Remove like/dislike existente
            AvaliacaoLike.objects.filter(
                avaliacao=avaliacao, 
                usuario=request.user
            ).delete()
            
            # Cria fingerprint para detecção de farming
            fingerprint_input = f"{request.META.get('REMOTE_ADDR')}_{request.user.id}_{avaliacao_id}"
            fingerprint = hashlib.sha256(fingerprint_input.encode()).hexdigest()
            
            # Adiciona novo like/dislike
            AvaliacaoLike.objects.create(
                avaliacao=avaliacao,
                usuario=request.user,
                tipo=tipo,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                fingerprint=fingerprint
            )
            
            # Atualiza contadores
            avaliacao.likes = AvaliacaoLike.objects.filter(
                avaliacao=avaliacao, 
                tipo='like'
            ).count()
            avaliacao.dislikes = AvaliacaoLike.objects.filter(
                avaliacao=avaliacao, 
                tipo='dislike'
            ).count()
            avaliacao.save()
            
            # Debounce: impede múltiplas interações em curto período
            cache.set(debounce_key, True, 2)  # 2 segundos
            
            return JsonResponse({
                'likes': avaliacao.likes,
                'dislikes': avaliacao.dislikes,
                'user_tipo': tipo
            })
            
    except Exception as e:
        logger.error(f"Erro no like: {str(e)}")
        return JsonResponse({'error': 'Erro ao processar'}, status=500)

@cache_page(60 * 5)  # Cache de 5 minutos
def listar_avaliacoes_api(request, produto_id):
    """API para carregar avaliações com keyset pagination para performance"""
    produto = get_object_or_404(Produto, id=produto_id)
    
    # Parâmetros
    cursor = request.GET.get('cursor')
    limit = int(request.GET.get('limit', 10))
    filtro_nota = request.GET.get('nota')
    filtro_com_midia = request.GET.get('com_midia')
    filtro_ordenar = request.GET.get('ordenar', 'recente')
    
    # Query base
    queryset = Avaliacao.objects.filter(
        produto=produto, 
        status='aprovado'
    ).select_related('usuario').prefetch_related('midias')
    
    # Aplica filtros
    if filtro_nota:
        queryset = queryset.filter(nota_geral=int(filtro_nota))
    
    if filtro_com_midia:
        queryset = queryset.annotate(num_midias=Count('midias')).filter(num_midias__gt=0)
    
    # Keyset pagination (mais eficiente que OFFSET para grandes datasets)
    if cursor:
        try:
            cursor_time = timezone.datetime.fromisoformat(cursor)
            queryset = queryset.filter(created_at__lt=cursor_time)
        except:
            pass
    
    # Ordenação
    if filtro_ordenar == 'mais_util':
        queryset = queryset.order_by('-util', '-created_at')
    elif filtro_ordenar == 'maior_nota':
        queryset = queryset.order_by('-nota_geral', '-created_at')
    elif filtro_ordenar == 'menor_nota':
        queryset = queryset.order_by('nota_geral', '-created_at')
    else:  # recente
        queryset = queryset.order_by('-created_at')
    
    # Limita resultados
    avaliacoes = list(queryset[:limit + 1])  # Pega um extra para saber se tem mais
    has_more = len(avaliacoes) > limit
    
    if has_more:
        avaliacoes = avaliacoes[:-1]
        next_cursor = avaliacoes[-1].created_at.isoformat()
    else:
        next_cursor = None
    
    # Serialização
    data = {
        'avaliacoes': [
            {
                'id': av.id,
                'usuario_nome': av.usuario.get_full_name() or av.usuario.email.split('@')[0],
                'usuario_iniciais': ''.join([n[0] for n in (av.usuario.get_full_name() or 'U').split()[:2]]).upper(),
                'nota_geral': av.nota_geral,
                'titulo': av.titulo,
                'comentario': av.comentario,
                'melhor_ponto': av.melhor_ponto,
                'pior_ponto': av.pior_ponto,
                'tempo_de_uso': av.tempo_de_uso,
                'recomendaria': av.recomendaria,
                'likes': av.likes,
                'dislikes': av.dislikes,
                'util': av.util,
                'nao_util': av.nao_util,
                'tempo_decorrido': naturaltime(av.publicado_em or av.created_at),
                'midias': [
                    {
                        'id': m.id,
                        'arquivo': m.arquivo.url,
                        'thumbnail': m.thumbnail.url if m.thumbnail else m.arquivo.url,
                        'tipo': m.tipo,
                        'legenda': m.legenda
                    } for m in av.midias.aprovadas()
                ]
            }
            for av in avaliacoes
        ],
        'pagination': {
            'has_more': has_more,
            'next_cursor': next_cursor,
            'total': queryset.count()
        }
    }
    
    return JsonResponse(data)