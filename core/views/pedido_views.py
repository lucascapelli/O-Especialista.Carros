# core/views/pedido_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
import logging
import json

from ..models import Pedido, Carrinho, Produto
from ..serializers import PedidoSerializer, PedidoDetailSerializer
from core.models.orders import StatusPedido, ItemPedido
from core.services.payment_service import gerar_pagamento
from core.models.payments import MetodoPagamento

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preparar_pagamento(request):
    """Prepara dados para pagamento SEM criar pedido no banco"""
    logger.info(f"Usuário {request.user.email} preparando pagamento.")
    
    try:
        usuario = request.user
        endereco_entrega_raw = request.data.get('endereco_entrega')
        metodo_pagamento_tipo = request.data.get('metodo_pagamento', 'pix')
        cpf_destinatario = request.data.get('cpf_destinatario', '')

        # 🔹 TRATAMENTO DO ENDEREÇO
        if isinstance(endereco_entrega_raw, str):
            endereco_entrega = json.loads(endereco_entrega_raw)
        else:
            endereco_entrega = endereco_entrega_raw

        if not endereco_entrega or not endereco_entrega.get('cep'):
            return Response({'error': 'Endereço de entrega com CEP é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        # 🔹 VALIDAR CPF/CNPJ DO DESTINATÁRIO
        if not cpf_destinatario:
            return Response({'error': 'CPF/CNPJ do destinatário é obrigatório para envio.'}, status=status.HTTP_400_BAD_REQUEST)

        carrinho = Carrinho.objects.filter(usuario=usuario).first()
        if not carrinho or not carrinho.itens.exists():
            return Response({'error': 'Carrinho vazio.'}, status=status.HTTP_400_BAD_REQUEST)

        # 🔥 MUDANÇA CRÍTICA: NÃO CRIAR PEDIDO AINDA!
        # Apenas calcular totais e preparar dados para pagamento
        
        total_pedido = 0
        itens_pedido = []
        
        for item in carrinho.itens.all():
            total_pedido += float(item.quantidade * item.produto.preco)
            itens_pedido.append({
                'produto_id': item.produto.id,
                'produto_nome': item.produto.nome,
                'quantidade': item.quantidade,
                'preco_unitario': float(item.produto.preco),
                'subtotal': float(item.quantidade * item.produto.preco)
            })

        # 🔥 Retornar dados para pagamento SEM criar pedido no banco
        response_data = {
            'message': 'Pagamento preparado com sucesso!',
            'dados_pagamento': {
                'total_final': total_pedido,
                'itens': itens_pedido,
                'endereco_entrega': endereco_entrega,
                'cpf_destinatario': cpf_destinatario,
                'metodo_pagamento': metodo_pagamento_tipo,
                'usuario_id': usuario.id,
                'carrinho_id': carrinho.id
            },
            'pagamento_simulado': {
                'id_transacao': f"pre_{usuario.id}_{carrinho.id}",
                'codigo_pagamento': f"PIX_SIMULADO_{usuario.id}_{carrinho.id}",
                'status': 'pendente',
                'simulado': True,
                'qr_code': 'data:image/svg+xml;base64,...'
            }
        }

        logger.info(f"✅ Pagamento preparado para usuário {usuario.email}. Total: R$ {total_pedido}")
        
        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Erro ao preparar pagamento: {str(e)}", exc_info=True)
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_pedido_apos_pagamento(request):
    """Cria pedido APÓS pagamento aprovado (chamado pelo webhook)"""
    try:
        data = request.data
        usuario_id = data.get('usuario_id')
        total_final = data.get('total_final')
        endereco_entrega = data.get('endereco_entrega')
        cpf_destinatario = data.get('cpf_destinatario')
        itens_pedido = data.get('itens', [])
        carrinho_id = data.get('carrinho_id')
        
        usuario = request.user
        if usuario.id != usuario_id:
            return Response({'error': 'Usuário não autorizado'}, status=status.HTTP_403_FORBIDDEN)

        # 🔥 AGORA SIM CRIAR O PEDIDO - pois o pagamento foi aprovado
        status_pedido = StatusPedido.objects.get_or_create(
            nome="Processando", defaults={"cor": "#F97316", "ordem": 2, "is_final": False}
        )[0]

        pedido = Pedido.objects.create(
            usuario=usuario,
            status=status_pedido,
            endereco_entrega=endereco_entrega,
            cpf_destinatario=cpf_destinatario,
            total_produtos=total_final,
            total_final=total_final
        )

        # Criar itens do pedido
        for item_data in itens_pedido:
            produto = Produto.objects.get(id=item_data['produto_id'])
            ItemPedido.objects.create(
                pedido=pedido,
                produto=produto,
                quantidade=item_data['quantidade'],
                preco_unitario=item_data['preco_unitario']
            )

        # Limpar carrinho
        carrinho = Carrinho.objects.filter(id=carrinho_id, usuario=usuario).first()
        if carrinho:
            carrinho.itens.all().delete()

        logger.info(f"✅ Pedido {pedido.id} criado APÓS pagamento aprovado")

        return Response({
            'success': True,
            'pedido_id': pedido.id,
            'numero_pedido': pedido.numero_pedido,
            'status': pedido.status.nome
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Erro ao criar pedido após pagamento: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@login_required
def meus_pedidos(request):
    """View para página de meus pedidos"""
    pedidos = Pedido.objects.filter(usuario=request.user).order_by('-criado_em')
    return render(request, 'core/front-end/meus_pedidos.html', {
        'pedidos': pedidos,
        'user': request.user
    })