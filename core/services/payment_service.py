# core/services/payment_service.py
from core.models.payments import Pagamento
from core.integrations.abacatepay import criar_pagamento
import logging

logger = logging.getLogger(__name__)

def gerar_pagamento(pedido, metodo_pagamento):
    """
    Gera pagamento SEMPRE em modo simulação
    """
    try:
        # Chama a integração (sempre simulação agora)
        response_data, error = criar_pagamento(pedido, metodo_pagamento)
        
        # Se tem erro, cria pagamento de erro mas COM id_transacao
        if error:
            logger.error(f"Erro ao criar pagamento: {error}")
            
            pagamento = Pagamento.objects.create(
                pedido=pedido,
                metodo=metodo_pagamento,
                valor=pedido.total_final,
                status="erro",
                id_transacao=f"erro_{pedido.id}",  # ✅ EVITA NULL
                codigo_pagamento=None,
                dados_transacao={"error": error}
            )
            return pagamento
        
        # Cria pagamento com dados da resposta (SIMULADO)
        pagamento = Pagamento.objects.create(
            pedido=pedido,
            metodo=metodo_pagamento,
            valor=pedido.total_final,
            status=response_data.get("status", "pendente"),
            id_transacao=response_data.get("id", f"sim_{pedido.id}"),  # ✅ SEMPRE TEM ID
            codigo_pagamento=response_data.get("codigo_pagamento") or response_data.get("codigo"),
            dados_transacao=response_data
        )
        
        logger.info(f"✅ Pagamento simulado criado com sucesso: {pagamento.id_transacao}")
        return pagamento
        
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        
        # Fallback que NUNCA gera NULL
        pagamento = Pagamento.objects.create(
            pedido=pedido,
            metodo=metodo_pagamento,
            valor=pedido.total_final,
            status="erro",
            id_transacao=f"exception_{pedido.id}",  # ✅ EVITA NULL
            codigo_pagamento=None,
            dados_transacao={"error": str(e)}
        )
        return pagamento