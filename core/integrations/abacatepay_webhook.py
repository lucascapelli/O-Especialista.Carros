# core/integrations/abacatepay_webhook.py
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

            # 🔥 AGORA O PEDIDO JÁ EXISTE (criado após pagamento) - apenas criar envio
            
            # 🔹 CRIAR ENVIO USANDO O NOVO SHIPPING SERVICE
            try:
                # Usar o método criar_envio que recebe o objeto pedido completo
                resultado_envio = shipping_service.criar_envio(pedido)
                
                if resultado_envio.get('status') == 'sucesso':
                    # Buscar ou criar transportadora Jadlog
                    transportadora, _ = Transportadora.objects.get_or_create(
                        codigo='JADLOG',
                        defaults={
                            'nome': 'Jadlog', 
                            'ativo': True,
                            'suporta_cotacao': True,
                            'suporta_rastreio': True
                        }
                    )
                    
                    # Criar objeto Envio no banco
                    envio = Envio.objects.create(
                        pedido=pedido,
                        transportadora=transportadora,
                        valor_frete=resultado_envio['valor_frete'],
                        prazo_dias=resultado_envio['prazo_dias'],
                        servico=resultado_envio['servico'],
                        codigo_rastreio=resultado_envio['codigo_rastreio'],
                        url_rastreio=resultado_envio['url_rastreio'],
                        status_entrega=resultado_envio['status_entrega'],
                        eventos_rastreio=[]
                    )
                    
                    # Atualizar status do pedido para "Enviado"
                    status_enviado = StatusPedido.objects.get_or_create(
                        nome="Enviado",
                        defaults={"cor": "#3B82F6", "ordem": 3, "is_final": False}
                    )[0]
                    pedido.status = status_enviado
                    pedido.save()

                    logger.info(f"✅ Envio criado com sucesso para pedido {pedido.id}")
                    logger.info(f"📦 Código de rastreio: {resultado_envio['codigo_rastreio']}")
                    
                else:
                    logger.error(f"❌ Erro ao criar envio para pedido {pedido.id}: {resultado_envio.get('erro')}")
                    
            except Exception as envio_error:
                logger.error(f"❌ Exceção ao criar envio para pedido {pedido.id}: {str(envio_error)}")

        elif status_pagamento.lower() in ["cancelado", "cancelled", "failed"]:
            # Atualizar status para "Cancelado" se o pagamento falhou
            status_cancelado = StatusPedido.objects.get_or_create(
                nome="Cancelado",
                defaults={"cor": "#EF4444", "ordem": 5, "is_final": True}
            )[0]
            pedido.status = status_cancelado
            pedido.save()
            logger.info(f"❌ Pagamento cancelado para pedido {pedido.id}")

        return JsonResponse({"success": True})

    except Pagamento.DoesNotExist:
        logger.error(f"Pagamento não encontrado: {id_transacao}")
        return JsonResponse({"error": "Pagamento não encontrado"}, status=404)

    except Exception as e:
        logger.error(f"Erro no webhook: {str(e)}", exc_info=True)
        return JsonResponse({"error": "Erro interno"}, status=500)