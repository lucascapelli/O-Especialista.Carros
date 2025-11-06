# views/pedido_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import render, get_object_or_404, redirect  # <-- ADICIONADO redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages  # <-- ADICIONADO
from django.db import models
from ..models import Pedido, Carrinho  # <-- CORRIGIDO: não é mais ..
from ..serializers import PedidoSerializer, PedidoDetailSerializer
from core.models.orders import StatusPedido, ItemPedido
from core.services.payment_service import gerar_pagamento
from core.models.payments import MetodoPagamento
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_pedido(request):
    # ... (seu código original mantido 100%)
    # (não alterado, só indentação corrigida)
    logger.info(f"Usuário {request.user.email} solicitou criação de pedido.")
    try:
        usuario = request.user
        endereco_entrega = request.data.get('endereco_entrega')
        metodo_pagamento_tipo = request.data.get('metodo_pagamento', 'pix')
        if not endereco_entrega:
            return Response({'error': 'Endereço de entrega é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        carrinho = Carrinho.objects.filter(usuario=usuario).first()
        if not carrinho or not carrinho.itens.exists():
            return Response({'error': 'Carrinho vazio.'}, status=status.HTTP_400_BAD_REQUEST)
        status_pedido = StatusPedido.objects.first() or StatusPedido.objects.create(nome="Pendente", cor="#6B7280", ordem=1)
        pedido = Pedido.objects.create(
            usuario=usuario,
            status=status_pedido,
            endereco_entrega=endereco_entrega,
            total_produtos=0,
            total_final=0
        )
        total_pedido = 0
        for item in carrinho.itens.all():
            ItemPedido.objects.create(
                pedido=pedido,
                produto=item.produto,
                quantidade=item.quantidade,
                preco_unitario=item.produto.preco
            )
            total_pedido += float(item.quantidade * item.produto.preco)
        pedido.total_produtos = total_pedido
        pedido.total_final = total_pedido
        pedido.save()
        carrinho.itens.all().delete()
        try:
            metodo_pagamento = MetodoPagamento.objects.get(tipo=metodo_pagamento_tipo)
        except MetodoPagamento.DoesNotExist:
            metodo_pagamento = MetodoPagamento.objects.create(nome="PIX", tipo="pix", config={})
        pagamento = gerar_pagamento(pedido, metodo_pagamento)
        response_data = {
            'message': 'Pedido criado com sucesso!',
            'pedido_id': pedido.id,
            'numero_pedido': pedido.numero_pedido,
            'total_final': float(pedido.total_final),
            'status': pedido.status.nome,
        }
        if pagamento:
            response_data['pagamento'] = {
                'codigo_pagamento': pagamento.codigo_pagamento or "CODIGO_PIX_SIMULADO",
                'status': pagamento.status,
                'id_transacao': pagamento.id_transacao,
                'simulado': True,
                'qr_code': pagamento.dados_transacao.get('qr_code', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QSVggU0lNVUxBRE88L3RleHQ+PC9zdmc+')
            }
        else:
            response_data['pagamento'] = {
                'simulado': True,
                'codigo_pagamento': '00020126580014BR.GOV.BCB.PIX0136simulado5204000053039865802BR5900MERCADO6008SAO PAULO6304',
                'qr_code': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QSVggU0lNVUxBRE88L3RleHQ+PC9zdmc+'
            }
        return Response(response_data, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f"Erro ao criar pedido: {str(e)}", exc_info=True)
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meus_pedidos_api(request):
    pedidos = Pedido.objects.filter(usuario=request.user).order_by('-criado_em')
    serializer = PedidoSerializer(pedidos, many=True)
    return Response({'pedidos': serializer.data, 'total': pedidos.count()})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalhes_pedido_api(request, pedido_id):
    try:
        if request.user.is_admin:
            pedido = Pedido.objects.select_related('usuario', 'status', 'pagamento').prefetch_related('itens__produto').get(id=pedido_id)
        else:
            pedido = Pedido.objects.select_related('usuario', 'status', 'pagamento').prefetch_related('itens__produto').get(id=pedido_id, usuario=request.user)
        serializer = PedidoDetailSerializer(pedido)
        return Response({'success': True, 'pedido': serializer.data})
    except Pedido.DoesNotExist:
        return Response({'success': False, 'error': 'Pedido não encontrado'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erro na API detalhes_pedido: {str(e)}")
        return Response({'success': False, 'error': 'Erro interno'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@login_required
def meus_pedidos(request):
    pedidos = Pedido.objects.filter(usuario=request.user).order_by('-criado_em')
    return render(request, 'core/front-end/meus_pedidos.html', {'pedidos': pedidos})

@login_required
def checkout(request):
    from .carrinho_views import get_or_create_carrinho  # <-- OK
    carrinho_obj = get_or_create_carrinho(request)
    if not carrinho_obj.itens.exists():
        messages.warning(request, 'Seu carrinho está vazio.')
        return redirect('carrinho')  # <-- AGORA FUNCIONA
    return render(request, 'core/front-end/checkout.html', {'carrinho': carrinho_obj})