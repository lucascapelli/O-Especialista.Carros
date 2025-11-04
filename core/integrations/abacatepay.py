# core/integrations/abacatepay.py
import logging
import random
import string
from typing import Dict, Optional, Tuple
from django.conf import settings
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def criar_pagamento(pedido, metodo_pagamento) -> Tuple[Optional[Dict], Optional[str]]:
    """
    SEMPRE usa modo simulação - AbacatePay não existe
    """
    logger.info("🎭 Usando MODO SIMULAÇÃO para pagamentos")
    
    return criar_pagamento_simulado(pedido, metodo_pagamento), None

def criar_pagamento_simulado(pedido, metodo_pagamento) -> Dict:
    """
    Simula a criação de um pagamento PIX
    """
    # Gera ID único para a transação
    transaction_id = f"sim_{pedido.id}_{''.join(random.choices(string.digits, k=8))}"
    
    # Gera código PIX simulado
    pix_code = f"00020126580014BR.GOV.BCB.PIX0136{transaction_id}5204000053039865405{pedido.total_final:.2f}5802BR5900MERCADO6008SAO PAULO62140510{transaction_id}6304"
    
    # Data de expiração 1 hora no futuro
    expires_at = datetime.now() + timedelta(hours=1)
    
    response_data = {
        "id": transaction_id,
        "status": "pending", 
        "codigo_pagamento": pix_code,
        "codigo": pix_code,  # Campo alternativo
        "valor": float(pedido.total_final),
        "qr_code": f"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QSVggU0lNVUxBRE88L3RleHQ+PC9zdmc+",
        "data_expiracao": expires_at.isoformat() + "Z",
        "dev_mode": True,
        "simulado": True,
        "mensagem": "Modo de desenvolvimento - Pagamento simulado"
    }
    
    logger.info(f"🎭 Pagamento PIX simulado criado: {transaction_id}")
    logger.info(f"🎭 Código PIX: {pix_code}")
    
    return response_data