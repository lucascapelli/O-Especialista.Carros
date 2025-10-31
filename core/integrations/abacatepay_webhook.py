# core/views.py

import json
import logging
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from core.models.payments import Pagamento

logger = logging.getLogger(__name__)

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

        logger.info(f"Status atualizado: {id_transacao} -> {status_pagamento}")

        return JsonResponse({"success": True})

    except Pagamento.DoesNotExist:
        logger.error(f"Pagamento não encontrado: {id_transacao}")
        return JsonResponse({"error": "Pagamento não encontrado"}, status=404)
    except Exception as e:
        logger.error(f"Erro no webhook: {str(e)}")
        return JsonResponse({"error": "Erro interno"}, status=500)
