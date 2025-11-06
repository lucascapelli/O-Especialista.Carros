# views/pagamento_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.services.payment_service import gerar_pagamento
from core.models.payments import MetodoPagamento
from core.models.orders import Pedido
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_pagamento_abacatepay(request, pedido_id):
    logger.info(f"Tentativa de criar pagamento - Pedido: {pedido_id}, Usuário: {request.user.email}")
    try:
        if request.user.is_admin:
            pedido = Pedido.objects.get(id=pedido_id)
        else:
            pedido = Pedido.objects.get(id=pedido_id, usuario=request.user)
        metodo_pagamento = MetodoPagamento.objects.get(tipo="pix")
        pagamento = gerar_pagamento(pedido, metodo_pagamento)
        if pagamento.status == "erro":
            logger.error(f"Falha ao gerar pagamento - Pedido: {pedido_id}, Status: {pagamento.status}")
            return Response({
                "error": "Falha ao criar pagamento",
                "status": pagamento.status
            }, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Pagamento criado com sucesso - Pedido: {pedido_id}, Código: {pagamento.codigo_pagamento}")
        return Response({
            "status": pagamento.status,
            "codigo_pagamento": pagamento.codigo_pagamento,
            "id_transacao": pagamento.id_transacao,
            "message": "Pagamento PIX criado com sucesso"
        })
    except Pedido.DoesNotExist:
        return Response({"error": "Pedido não encontrado"}, status=status.HTTP_404_NOT_FOUND)
    except MetodoPagamento.DoesNotExist:
        return Response({"error": "Método de pagamento não disponível"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        return Response({"error": "Erro interno do servidor"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)