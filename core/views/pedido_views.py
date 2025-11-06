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
from core.services.shipping_service import ShippingService
from core.models.shipping import Envio, Transportadora

logger = logging.getLogger(__name__)
shipping_service = ShippingService()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_pedido(request):
    logger.info(f"Usuário {request.user.email} solicitou criação de pedido.")

    try:
        usuario = request.user
        endereco_entrega_raw = request.data.get('endereco_entrega')
        metodo_pagamento_tipo = request.data.get('metodo_pagamento', 'pix')

        # 🔹 TRATAMENTO DO ENDEREÇO - pode vir como JSON string ou dict
        endereco_entrega = None
        if isinstance(endereco_entrega_raw, str):
            try:
                endereco_entrega = json.loads(endereco_entrega_raw)
                logger.info(f"Endereço convertido de string JSON: {endereco_entrega}")
            except json.JSONDecodeError as e:
                logger.error(f"Erro ao decodificar JSON do endereço: {endereco_entrega_raw} - Erro: {e}")
                return Response({'error': 'Formato inválido do endereço de entrega.'}, status=status.HTTP_400_BAD_REQUEST)
        elif isinstance(endereco_entrega_raw, dict):
            endereco_entrega = endereco_entrega_raw
        else:
            return Response({'error': 'Endereço de entrega é obrigatório e deve ser um objeto válido.'}, status=status.HTTP_400_BAD_REQUEST)

        if not endereco_entrega or not endereco_entrega.get('cep'):
            return Response({'error': 'Endereço de entrega com CEP é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        carrinho = Carrinho.objects.filter(usuario=usuario).first()
        if not carrinho or not carrinho.itens.exists():
            return Response({'error': 'Carrinho vazio.'}, status=status.HTTP_400_BAD_REQUEST)

        status_pedido = StatusPedido.objects.first() or StatusPedido.objects.create(
            nome="Pendente", cor="#6B7280", ordem=1
        )

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

        # 🔹 PAGAMENTO
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
                'qr_code': pagamento.dados_transacao.get('qr_code', 'data:image/svg+xml;base64,...')
            }
        else:
            response_data['pagamento'] = {'simulado': True, 'codigo_pagamento': '000201...', 'qr_code': 'data:image/svg+xml;base64,...'}

        # 🔹 ENVIO (Jadlog)
        try:
            transportadora = Transportadora.objects.filter(nome__icontains="Jadlog").first()
            if not transportadora:
                transportadora = Transportadora.objects.create(
                    nome="Jadlog",
                    codigo="JADLOG_API",
                    config={"api": "jadlog"},
                    suporta_cotacao=True,
                    suporta_rastreio=True
                )

            origem = {"cep": "01153000"}  # CEP fixo da loja
            destino = {
                "cep": endereco_entrega.get("cep", "").replace("-", ""),  # Remove hífen se existir
                "logradouro": endereco_entrega.get("logradouro", ""),
                "numero": endereco_entrega.get("numero", ""),
                "bairro": endereco_entrega.get("bairro", ""),
                "cidade": endereco_entrega.get("cidade", ""),
                "uf": endereco_entrega.get("uf", ""),
                "nome": usuario.get_full_name() or usuario.email,
            }

            # 🔹 CÁLCULO DE PESO COM FALLBACK SEGURO
            peso_total = sum(
                (getattr(item.produto, "peso", None) or 1.0) 
                for item in pedido.itens.all()
            )
            # Garante que o peso mínimo seja 0.1kg
            peso_total = max(peso_total, 0.1)
            
            valor_total = float(pedido.total_final)

            logger.info(f"Criando envio Jadlog - Peso: {peso_total}kg, Valor: R${valor_total}")

            envio_resultado = shipping_service.criar_envio(
                pedido_id=pedido.id,
                origem=origem,
                destino=destino,
                peso=peso_total,
                valor=valor_total,
                nome_cliente=usuario.get_full_name() or usuario.email
            )

            # Cria registro de envio com fallbacks seguros
            envio_obj = Envio.objects.create(
                pedido=pedido,
                transportadora=transportadora,
                valor_frete=envio_resultado.get("valor_frete", 0),
                prazo_dias=envio_resultado.get("prazo_dias", 5),
                servico=envio_resultado.get("servico", "Jadlog Expresso"),
                codigo_rastreio=envio_resultado.get("codigo_rastreio", ""),
                url_rastreio=envio_resultado.get("url_rastreio", ""),
                status_entrega=envio_resultado.get("status_entrega", "pendente"),
                eventos_rastreio=[]
            )

            response_data["envio"] = {
                "transportadora": "Jadlog",
                "codigo_rastreio": envio_obj.codigo_rastreio,
                "status": envio_obj.status_entrega,
                "prazo_dias": envio_obj.prazo_dias,
                "valor_frete": float(envio_obj.valor_frete),
                "url_rastreio": envio_obj.url_rastreio,
            }

            logger.info(f"Envio criado com sucesso: {envio_obj.codigo_rastreio}")

        except Exception as e:
            logger.error(f"Erro ao criar envio: {e}", exc_info=True)
            response_data["envio"] = {"erro": str(e), "status": "erro"}

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
    from .carrinho_views import get_or_create_carrinho
    carrinho_obj = get_or_create_carrinho(request)
    if not carrinho_obj.itens.exists():
        messages.warning(request, 'Seu carrinho está vazio.')
        return redirect('carrinho')
    return render(request, 'core/front-end/checkout.html', {'carrinho': carrinho_obj})