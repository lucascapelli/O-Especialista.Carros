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

from ..models import Pedido, Carrinho
from ..serializers import PedidoSerializer, PedidoDetailSerializer
from core.models.orders import StatusPedido, ItemPedido
from core.services.payment_service import gerar_pagamento
from core.models.payments import MetodoPagamento

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_pedido(request):
    logger.info(f"Usuário {request.user.email} solicitou criação de pedido.")

    try:
        usuario = request.user
        endereco_entrega_raw = request.data.get('endereco_entrega')
        metodo_pagamento_tipo = request.data.get('metodo_pagamento', 'pix')
        cpf_destinatario = request.data.get('cpf_destinatario', '')  # 🔹 NOVO CAMPO

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

        status_pedido = StatusPedido.objects.first() or StatusPedido.objects.create(
            nome="Pendente", cor="#6B7280", ordem=1
        )

        # 🔹 CRIAR PEDIDO COM CPF_DESTINATARIO
        pedido = Pedido.objects.create(
            usuario=usuario,
            status=status_pedido,
            endereco_entrega=endereco_entrega,
            cpf_destinatario=cpf_destinatario,  # 🔹 SALVAR CPF/CNPJ
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

        # 🔹 PAGAMENTO
        metodo_pagamento, _ = MetodoPagamento.objects.get_or_create(
            tipo=metodo_pagamento_tipo,
            defaults={"nome": "PIX", "config": {}}
        )

        pagamento = gerar_pagamento(pedido, metodo_pagamento)

        response_data = {
            'message': 'Pedido criado com sucesso! Aguardando pagamento.',
            'pedido_id': pedido.id,
            'numero_pedido': pedido.numero_pedido,
            'total_final': float(pedido.total_final),
            'status': pedido.status.nome,
            'pagamento': {
                'codigo_pagamento': pagamento.codigo_pagamento or "CODIGO_PIX_SIMULADO",
                'status': pagamento.status,
                'id_transacao': pagamento.id_transacao,
                'simulado': True,
                'qr_code': pagamento.dados_transacao.get('qr_code', 'data:image/svg+xml;base64,...')
            },
            'envio': {
                'status': 'aguardando_pagamento',
                'mensagem': 'O envio será criado automaticamente após a confirmação do pagamento.'
            }
        }

        logger.info(f"Pedido {pedido.id} criado com sucesso. Aguardando pagamento.")

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Erro ao criar pedido: {str(e)}", exc_info=True)
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)