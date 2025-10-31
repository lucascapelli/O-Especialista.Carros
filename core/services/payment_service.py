from core.models.payments import Pagamento
from core.integrations.abacatepay import criar_pagamento

def gerar_pagamento(pedido, metodo_pagamento):
    response_data, error = criar_pagamento(pedido, metodo_pagamento)
    
    if error or not response_data:
        pagamento = Pagamento.objects.create(
            pedido=pedido,
            metodo=metodo_pagamento,
            valor=pedido.total_final,
            status="erro",
            id_transacao=None,
            codigo_pagamento=None,
            dados_transacao={"error": error}
        )
        return pagamento  # ✅ Retorna APENAS o pagamento
    
    # Cria pagamento normal
    pagamento = Pagamento.objects.create(
        pedido=pedido,
        metodo=metodo_pagamento,
        valor=pedido.total_final,
        status="processando" if response_data.get("status") != "pending" else "pending",
        id_transacao=response_data.get("id"),
        codigo_pagamento=response_data.get("codigo"),
        dados_transacao=response_data
    )
    
    return pagamento  # ✅ Retorna APENAS o pagamento (REMOVE O ", None")