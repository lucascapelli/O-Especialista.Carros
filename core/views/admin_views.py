# core/views/admin_views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_GET
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db import models
from django.utils import timezone
from datetime import timedelta
from ..models import User, Produto, Pedido
from core.models.orders import StatusPedido
import logging
import json

logger = logging.getLogger(__name__)

def calcular_stats_reais():
    """Calcula estatísticas REAIS do banco de dados - CORRIGIDA"""
    hoje = timezone.now().date()
    ontem = hoje - timedelta(days=1)
    mes_passado = hoje - timedelta(days=30)
    
    # Pedidos totais
    total_pedidos = Pedido.objects.all()
    pedidos_hoje = total_pedidos.filter(criado_em__date=hoje)
    pedidos_ontem = total_pedidos.filter(criado_em__date=ontem)
    pedidos_mes_passado = total_pedidos.filter(criado_em__date__gte=mes_passado, criado_em__date__lt=hoje)
    pedidos_pendentes = total_pedidos.filter(status__nome='Pendente')
    
    # Cálculos REAIS
    total_vendas = float(total_pedidos.aggregate(total=models.Sum('total_final'))['total'] or 0)
    total_vendas_mes_passado = float(pedidos_mes_passado.aggregate(total=models.Sum('total_final'))['total'] or 0)
    
    pedidos_hoje_count = pedidos_hoje.count()
    pedidos_ontem_count = pedidos_ontem.count()
    
    # Crescimento REAL (não estático)
    sales_growth = 0
    if total_vendas_mes_passado > 0:
        sales_growth = ((total_vendas - total_vendas_mes_passado) / total_vendas_mes_passado) * 100
    
    # Mudança desde ontem
    mudanca_hoje = pedidos_hoje_count - pedidos_ontem_count
    mudanca_hoje_str = f"+{mudanca_hoje}" if mudanca_hoje >= 0 else f"{mudanca_hoje}"
    
    # Ticket médio REAL
    ticket_medio = 0
    ticket_medio_mes_passado = 0
    if total_pedidos.count() > 0:
        ticket_medio = float(total_pedidos.aggregate(avg=models.Avg('total_final'))['avg'] or 0)
    if pedidos_mes_passado.count() > 0:
        ticket_medio_mes_passado = float(pedidos_mes_passado.aggregate(avg=models.Avg('total_final'))['avg'] or 0)
    
    # Crescimento do ticket REAL
    ticket_growth = 0
    if ticket_medio_mes_passado > 0:
        ticket_growth = ((ticket_medio - ticket_medio_mes_passado) / ticket_medio_mes_passado) * 100
    
    return {
        'total_sales': total_vendas,
        'sales_growth': round(sales_growth, 1),  # AGORA DINÂMICO
        'orders_today': pedidos_hoje_count,
        'orders_today_change': mudanca_hoje_str,
        'pending_orders': pedidos_pendentes.count(),
        'pending_orders_change': mudanca_hoje,  # AGORA DINÂMICO
        'average_ticket': ticket_medio,
        'average_ticket_growth': round(ticket_growth, 1)  # AGORA DINÂMICO
    }

# ===================== PERFIL USUÁRIO =====================
@login_required
def perfil_usuario(request):
    return render(request, 'core/front-end/perfil.html', {'usuario': request.user})

# ===================== ADMIN INDEX =====================
@csrf_protect
@login_required
def admin_index(request):
    if not request.user.is_authenticated or not request.user.is_admin:
        logger.warning(f"Acesso negado à admin_index - Usuário: {request.user}")
        return redirect('admin_login')

    site_language = request.GET.get('site_language', 'pt-BR')
    section = request.GET.get('section', 'dashboard')

    # DEBUG - Verificar parâmetros recebidos
    print(f"🎯 DEBUG ADMIN - Section: {section}, GET: {dict(request.GET)}")

    # Filtro de usuários (para outras seções)
    users_list = User.objects.all().order_by('-id')
    users_search = request.GET.get('search', '')
    if users_search:
        users_list = users_list.filter(
            models.Q(first_name__icontains=users_search) |
            models.Q(last_name__icontains=users_search) |
            models.Q(email__icontains=users_search)
        )

    paginator = Paginator(users_list, 10)
    page_number = request.GET.get('page', 1)
    users_page = paginator.get_page(page_number)

    # CALCULAR STATS REAIS SEMPRE
    stats_reais = calcular_stats_reais()
    
    # CONTEXT BASE - sempre inclui stats básicos
    context = {
        'site_language': site_language,
        'is_admin': True,
        'current_section': section,
        'sales_stats': stats_reais,
        'dashboard_stats': stats_reais,
        'recent_orders': Pedido.objects.all().select_related('usuario', 'status')[:5],
        'recent_products': Produto.objects.all()[:5],
        'products': Produto.objects.all(),
        'users': users_page,
        'user_roles': ['Admin', 'Usuário']
    }

    # SEÇÃO VENDAS - tratamento específico
    if section == 'vendas':
        orders_search = request.GET.get('search', '')
        orders_status = request.GET.get('status', 'Todos')
        orders_page_num = request.GET.get('page', 1)
        
        print(f"📊 DEBUG VENDAS - Status: {orders_status}, Search: {orders_search}, Page: {orders_page_num}")

        # Query base para pedidos
        orders_list = Pedido.objects.all().select_related(
            'usuario', 'status', 'pagamento'
        ).order_by('-criado_em')

        # Aplicar filtros
        if orders_status and orders_status != 'Todos':
            orders_list = orders_list.filter(status__nome=orders_status)
            print(f"🔍 Filtro status aplicado: {orders_status} -> {orders_list.count()} pedidos")
        
        if orders_search:
            orders_list = orders_list.filter(
                models.Q(numero_pedido__icontains=orders_search) |
                models.Q(usuario__first_name__icontains=orders_search) |
                models.Q(usuario__last_name__icontains=orders_search) |
                models.Q(usuario__email__icontains=orders_search)
            )
            print(f"🔍 Filtro busca aplicado: {orders_search} -> {orders_list.count()} pedidos")

        # Paginação
        orders_paginator = Paginator(orders_list, 10)
        orders_page = orders_paginator.get_page(orders_page_num)
        
        # Atualizar context para vendas
        context.update({
            'orders': orders_page,
            'status': orders_status,  # Usar orders_status para a seção vendas
            'search_query': orders_search
        })
        
        print(f"✅ VENDAS - Pedidos na página: {len(orders_page)}")

    logger.info(f"Admin acessou painel: {request.user.email} - Seção: {section}")
    return render(request, 'core/admin-front-end/admin_index.html', context)

# ===================== DELETE USER =====================
@require_http_methods(["POST"])
@csrf_protect
def delete_user(request, user_id):
    if not request.user.is_authenticated or not request.user.is_admin:
        return JsonResponse({'success': False, 'error': 'Permissão negada'}, status=403)
    try:
        user_to_delete = get_object_or_404(User, id=user_id)
        if user_to_delete.id == request.user.id:
            return JsonResponse({'success': False, 'error': 'Você não pode excluir sua própria conta.'}, status=400)
        logger.info(f"Usuário {user_to_delete.email} excluído por admin: {request.user.email}")
        user_to_delete.delete()
        return JsonResponse({'success': True, 'message': 'Usuário excluído com sucesso!'})
    except Exception as e:
        logger.error(f"Erro ao excluir usuário {user_id}: {str(e)}")
        return JsonResponse({'success': False, 'error': f'Erro: {str(e)}'}, status=500)

# ===================== ADMIN PEDIDOS =====================
@login_required
def admin_pedidos(request):
    if not request.user.is_admin:
        return redirect('admin_login')
    status_filter = request.GET.get('status', 'todos')
    search_query = request.GET.get('search', '')
    pedidos = Pedido.objects.all().order_by('-criado_em')
    if status_filter != 'todos':
        pedidos = pedidos.filter(status__nome=status_filter)
    if search_query:
        pedidos = pedidos.filter(
            models.Q(numero_pedido__icontains=search_query) |
            models.Q(usuario__email__icontains=search_query) |
            models.Q(usuario__first_name__icontains=search_query) |
            models.Q(usuario__last_name__icontains=search_query)
        )
    paginator = Paginator(pedidos, 10)
    page_number = request.GET.get('page', 1)
    pedidos_page = paginator.get_page(page_number)
    return render(request, 'core/admin-front-end/admin_pedidos.html', {
        'pedidos': pedidos_page,
        'status_filter': status_filter,
        'search_query': search_query
    })

@require_GET
@login_required
def detalhes_pedido_admin(request, pedido_id):
    if not request.user.is_admin:
        return JsonResponse({'success': False, 'error': 'Permissão negada'}, status=403)
    try:
        pedido = get_object_or_404(Pedido, id=pedido_id)
        
        # DEBUG: Verificar relações disponíveis
        print(f"🔍 DEBUG - Buscando itens do pedido {pedido_id}")
        print(f"📦 Atributos do pedido: {[attr for attr in dir(pedido) if 'item' in attr.lower()]}")
        
        # CORREÇÃO: Use a relação correta baseada no seu modelo
        # Tente diferentes nomes comuns para a relação de itens
        itens = []
        
        # Opção 1: Tentar 'itens' (mais comum)
        if hasattr(pedido, 'itens') and callable(getattr(pedido, 'itens')):
            try:
                itens = pedido.itens.all()
                print(f"✅ Itens encontrados via 'itens': {itens.count()}")
            except Exception as e:
                print(f"❌ Erro em 'itens': {e}")
        
        # Opção 2: Se 'itens' não funcionar, tentar acessar via related_name
        if not itens:
            try:
                # Buscar qualquer relação que contenha 'item' no nome
                for field_name in dir(pedido):
                    if 'item' in field_name.lower() and not field_name.startswith('_'):
                        field = getattr(pedido, field_name)
                        if hasattr(field, 'all'):
                            itens = field.all()
                            print(f"✅ Itens encontrados via '{field_name}': {itens.count()}")
                            break
            except Exception as e:
                print(f"❌ Erro em busca por related_name: {e}")
        
        # Opção 3: Último recurso - buscar manualmente
        if not itens:
            try:
                from core.models.orders import ItemPedido  # Ajuste conforme seu modelo
                itens = ItemPedido.objects.filter(pedido=pedido)
                print(f"✅ Itens encontrados manualmente: {itens.count()}")
            except Exception as e:
                print(f"❌ Erro em busca manual: {e}")
        
        # Se ainda não encontrou, criar lista vazia
        if not itens:
            itens = []
            print("⚠️ Nenhum item encontrado para o pedido")

        # Serializar os dados
        dados_pedido = {
            'id': pedido.id,
            'numero_pedido': pedido.numero_pedido,
            'cliente_nome': f"{pedido.usuario.first_name} {pedido.usuario.last_name}".strip() or pedido.usuario.email,
            'cliente_email': pedido.usuario.email,
            'cliente_telefone': getattr(pedido.usuario.cliente, 'telefone', 'N/A') if hasattr(pedido.usuario, 'cliente') else 'N/A',
            'endereco_entrega': getattr(pedido, 'endereco_entrega', 'N/A'),
            'itens': [
                {
                    'produto_nome': item.produto.nome if item.produto else 'Produto não encontrado',
                    'quantidade': item.quantidade,
                    'subtotal': float(item.subtotal) if item.subtotal else 0.0
                } for item in itens
            ],
            'total_produtos': float(pedido.total_produtos or 0),
            'total_frete': float(pedido.total_frete or 0),
            'total_descontos': float(pedido.total_descontos or 0),
            'total_final': float(pedido.total_final or 0),
            'status': pedido.status.nome if pedido.status else 'N/A',
            'status_pagamento': getattr(pedido.pagamento, 'status', 'N/A') if pedido.pagamento else 'N/A',
            'criado_em': pedido.criado_em.isoformat() if pedido.criado_em else None
        }

        print(f"✅ Dados serializados - {len(dados_pedido['itens'])} itens")
        return JsonResponse({'success': True, 'pedido': dados_pedido})
        
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes do pedido {pedido_id}: {str(e)}")
        return JsonResponse({'success': False, 'error': f'Erro interno: {str(e)}'}, status=500)

# ===================== ADMIN PRODUTOS =====================
@login_required
def admin_produtos(request):
    if not request.user.is_admin:
        return redirect('admin_login')
    search_query = request.GET.get('search', '')
    categoria_filter = request.GET.get('categoria', '')
    produtos = Produto.objects.all().order_by('-criado_em')
    if search_query:
        produtos = produtos.filter(models.Q(nome__icontains=search_query) | models.Q(descricao__icontains=search_query))
    if categoria_filter:
        produtos = produtos.filter(categoria=categoria_filter)
    paginator = Paginator(produtos, 10)
    page_number = request.GET.get('page', 1)
    produtos_page = paginator.get_page(page_number)
    return render(request, 'core/admin-front-end/admin_produtos.html', {
        'produtos': produtos_page,
        'search_query': search_query,
        'categoria_filter': categoria_filter
    })

# ===================== ATUALIZAR STATUS PEDIDO =====================
@csrf_exempt
@require_http_methods(["PUT"])
@login_required
def atualizar_status_pedido(request, pedido_id):
    if not request.user.is_admin:
        return JsonResponse({'success': False, 'error': 'Permissão negada'}, status=403)
    
    try:
        data = json.loads(request.body)
        novo_status_nome = data.get('status')
        
        print(f"🔄 ATUALIZAR STATUS - Pedido: {pedido_id}, Novo Status: {novo_status_nome}")
        
        if not novo_status_nome:
            return JsonResponse({'success': False, 'error': 'Status não informado'}, status=400)

        # CORREÇÃO: Buscar o status existente no banco
        try:
            status_obj = StatusPedido.objects.get(nome=novo_status_nome)
        except StatusPedido.DoesNotExist:
            # Listar status disponíveis para ajudar no debug
            status_disponiveis = list(StatusPedido.objects.values_list('nome', flat=True))
            return JsonResponse({
                'success': False, 
                'error': f'Status "{novo_status_nome}" não encontrado. Status disponíveis: {", ".join(status_disponiveis)}'
            }, status=400)
        
        pedido = get_object_or_404(Pedido, id=pedido_id)
        pedido.status = status_obj
        pedido.save()

        logger.info(f"Status do pedido {pedido_id} alterado para {novo_status_nome}")
        return JsonResponse({
            'success': True, 
            'message': f'Status atualizado para: {novo_status_nome}',
            'novo_status': novo_status_nome
        })
        
    except Exception as e:
        logger.error(f"Erro ao atualizar status pedido {pedido_id}: {str(e)}")
        return JsonResponse({
            'success': False, 
            'error': f'Erro interno: {str(e)}'
        }, status=500)