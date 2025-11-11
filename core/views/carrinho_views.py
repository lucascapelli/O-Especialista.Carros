# core/views/carrinho_views.py
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from ..models import Carrinho, ItemCarrinho, Produto
from ..services.shipping_service import ShippingService  # 👈 ADICIONAR ESTA LINHA
import uuid
import json

# Instanciar o serviço para ser usado nas views
shipping_service = ShippingService()

def get_or_create_carrinho(request):
    if request.user.is_authenticated:
        carrinho, created = Carrinho.objects.get_or_create(usuario=request.user)
    else:
        session_key = request.session.get('carrinho_sessao')
        if not session_key:
            session_key = str(uuid.uuid4())
            request.session['carrinho_sessao'] = session_key
        carrinho, created = Carrinho.objects.get_or_create(
            sessao=session_key,
            usuario=None
        )
    return carrinho

def carrinho(request):
    carrinho_obj = get_or_create_carrinho(request)
    return render(request, 'core/front-end/carrinho.html', {'carrinho': carrinho_obj})

@require_http_methods(["POST"])
@csrf_protect
def adicionar_carrinho(request, produto_id):
    try:
        produto = get_object_or_404(Produto, id=produto_id)
        if produto.estoque <= 0:
            return JsonResponse({'success': False, 'error': 'Produto fora de estoque'}, status=400)
        carrinho_obj = get_or_create_carrinho(request)
        item, created = ItemCarrinho.objects.get_or_create(
            carrinho=carrinho_obj,
            produto=produto,
            defaults={'preco_unitario': produto.preco}
        )
        if not created:
            if item.quantidade >= produto.estoque:
                return JsonResponse({'success': False, 'error': 'Estoque insuficiente'}, status=400)
            item.quantidade += 1
            item.save()
        carrinho_obj.refresh_from_db()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'total_itens': carrinho_obj.total_itens,
                'message': 'Produto adicionado ao carrinho!'
            })
        return redirect('carrinho')
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@require_http_methods(["POST"])
@csrf_protect
def remover_carrinho(request, item_id):
    try:
        item = get_object_or_404(ItemCarrinho, id=item_id)
        carrinho_obj = get_or_create_carrinho(request)
        if item.carrinho != carrinho_obj:
            return JsonResponse({'success': False, 'error': 'Item não encontrado'})
        item.delete()
        carrinho_obj.refresh_from_db()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'total_itens': carrinho_obj.total_itens,
                'message': 'Produto removido do carrinho!'
            })
        return redirect('carrinho')
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def carrinho_json(request):
    try:
        carrinho_obj = get_or_create_carrinho(request)
        frete = 0
        return JsonResponse({
            'subtotal': float(carrinho_obj.total_preco),
            'frete': frete,
            'total': float(carrinho_obj.total_preco) + frete,
            'total_itens': carrinho_obj.total_itens
        })
    except Exception:
        return JsonResponse({'subtotal': 0, 'frete': 0, 'total': 0, 'total_itens': 0})

@require_http_methods(["POST"])
@csrf_protect
def alterar_quantidade(request, item_id):
    try:
        item = get_object_or_404(ItemCarrinho, id=item_id)
        carrinho_obj = get_or_create_carrinho(request)
        if item.carrinho != carrinho_obj:
            return JsonResponse({'success': False, 'error': 'Item não encontrado'})
        if not request.body:
            return JsonResponse({'success': False, 'error': 'Dados não fornecidos'})
        data = json.loads(request.body)
        nova_quantidade = int(data.get('quantidade', 1))
        if nova_quantidade > item.produto.estoque:
            return JsonResponse({
                'success': False,
                'error': f'Estoque insuficiente. Disponível: {item.produto.estoque}'
            })
        if nova_quantidade < 1:
            item.delete()
            subtotal_item = 0
        else:
            item.quantidade = nova_quantidade
            item.save()
            subtotal_item = float(item.subtotal)
        carrinho_obj.refresh_from_db()
        return JsonResponse({
            'success': True,
            'subtotal_item': subtotal_item,
            'total_itens': carrinho_obj.total_itens,
            'message': 'Quantidade atualizada!'
        })
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Dados JSON inválidos'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# 👇 NOVA VIEW PARA SIMULAÇÃO DE FRETE
@require_http_methods(["POST"])
@csrf_exempt  # Usar csrf_exempt para API, ou manter csrf_protect se usar token
def simular_frete_carrinho(request):
    """
    View para simulação de frete baseado nos itens do carrinho
    """
    try:
        data = json.loads(request.body)
        cep_destino = data.get('cep_destino')
        
        # CEP de origem da loja - deve vir das configurações
        from django.conf import settings
        origem_cep = getattr(settings, 'LOJA_CEP', '01001000')  # Fallback para CEP de SP

        if not cep_destino or len(cep_destino.replace('-', '')) != 8:
            return JsonResponse({
                'success': False, 
                'error': 'CEP de destino inválido. Deve conter 8 dígitos.'
            }, status=400)

        # Limpar CEP (remover traços)
        cep_destino = cep_destino.replace('-', '')
        origem_cep = origem_cep.replace('-', '')

        carrinho_obj = get_or_create_carrinho(request)
        itens_carrinho_lista = []
        
        # Converter itens do carrinho para formato do shipping service
        for item in carrinho_obj.itens.all():
            itens_carrinho_lista.append({
                'quantidade': item.quantidade,
                'peso': float(item.produto.peso or 0.1),  # Fallback para 100g
                'altura': float(item.produto.altura or 1),  # Fallback para 1cm
                'largura': float(item.produto.largura or 1),  # Fallback para 1cm
                'comprimento': float(item.produto.comprimento or 1),  # Fallback para 1cm
                'valor': float(item.preco_unitario)
            })
            
        if not itens_carrinho_lista:
            return JsonResponse({
                'success': False, 
                'error': 'Carrinho vazio. Adicione produtos para calcular o frete.'
            }, status=400)

        # Chamar o serviço de frete
        resultado_frete = shipping_service.calcular_frete(
            origem_cep=origem_cep,
            destino_cep=cep_destino,
            itens_pedido=itens_carrinho_lista
        )

        if resultado_frete.get('status') == 'sucesso':
            valor_frete = float(resultado_frete['valor_frete'])
            prazo_dias = int(resultado_frete['prazo_dias'])
            total_com_frete = float(carrinho_obj.total_preco) + valor_frete
            
            return JsonResponse({
                'success': True,
                'frete': valor_frete,
                'prazo_dias': prazo_dias,
                'servico': resultado_frete['servico'],
                'subtotal': float(carrinho_obj.total_preco),
                'total_com_frete': total_com_frete,
                'cep_destino': cep_destino,
                'message': f'Frete calculado: R$ {valor_frete:.2f} - Prazo: {prazo_dias} dia(s)'
            })
        else:
            error_message = resultado_frete.get('erro', 'Erro desconhecido na cotação de frete')
            return JsonResponse({
                'success': False, 
                'error': error_message
            }, status=500)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False, 
            'error': 'Dados JSON inválidos no corpo da requisição'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'error': f'Erro interno ao calcular frete: {str(e)}'
        }, status=500)