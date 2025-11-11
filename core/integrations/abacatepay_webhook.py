import json
import logging
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from core.models.payments import Pagamento
from core.models.orders import Pedido, StatusPedido
from core.models.shipping import Envio, Transportadora
from core.services.shipping_service import ShippingService

logger = logging.getLogger(__name__)
shipping_service = ShippingService()

@csrf_exempt
def abacatepay_webhook(request):
    try:
        data = json.loads(request.body)
        id_transacao = data.get("id")
        status_pagamento = data.get("status")

        logger.info(f"Webhook recebido: {id_transacao} -> {status_pagamento}")

        pagamento = Pagamento.objects.get(id_transacao=id_transacao)
        pagamento.status = status_pagamento
        pagamento.save()

        pedido = pagamento.pedido

        # 🔹 Se o pagamento foi aprovado
        if status_pagamento.lower() in ["pago", "approved", "success"]:
            logger.info(f"Pagamento confirmado para pedido {pedido.id}. Criando envio...")

            status_pago, _ = StatusPedido.objects.get_or_create(
                nome="Pago",
                defaults={"cor": "#10B981", "ordem": 2}
            )
            pedido.status = status_pago
            pedido.save()

            # 🔹 Criação do envio (só agora)
            transportadora = Transportadora.objects.filter(nome__icontains="Jadlog").first()
            if not transportadora:
                transportadora = Transportadora.objects.create(
                    nome="Jadlog",
                    codigo="JADLOG_API",
                    config={"api": "jadlog"},
                    suporta_cotacao=True,
                    suporta_rastreio=True
                )

            origem = {"cep": "01153000"}
            destino = pedido.endereco_entrega
            peso_total = sum((getattr(item.produto, "peso", None) or 1.0) for item in pedido.itens.all())
            peso_total = max(peso_total, 0.1)
            valor_total = float(pedido.total_final)

            # 🔹 Use apenas o email do usuário para evitar AttributeError
            nome_cliente = getattr(pedido.usuario, "email", "Cliente")

            envio_resultado = shipping_service.criar_envio(
                pedido_id=pedido.id,
                origem=origem,
                destino=destino,
                peso=peso_total,
                valor=valor_total,
                nome_cliente=nome_cliente
            )

            Envio.objects.create(
                pedido=pedido,
                transportadora=transportadora,
                valor_frete=envio_resultado.get("valor_frete", 0),
                prazo_dias=envio_resultado.get("prazo_dias", 5),
                servico=envio_resultado.get("servico", "Jadlog Expresso"),
                codigo_rastreio=envio_resultado.get("codigo_rastreio", ""),
                url_rastreio=envio_resultado.get("url_rastreio", ""),
                status_entrega="em_transporte",
                eventos_rastreio=[]
            )

            logger.info(f"Envio criado com sucesso para pedido {pedido.id}")

        return JsonResponse({"success": True})

    except Pagamento.DoesNotExist:
        logger.error(f"Pagamento não encontrado: {id_transacao}")
        return JsonResponse({"error": "Pagamento não encontrado"}, status=404)

    except Exception as e:
        logger.error(f"Erro no webhook: {str(e)}", exc_info=True)
        return JsonResponse({"error": "Erro interno"}, status=500)
