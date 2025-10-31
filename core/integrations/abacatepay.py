import os
import requests
import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

ABACATEPAY_API_URL = os.getenv("ABACATEPAY_API_URL")
ABACATEPAY_API_KEY = os.getenv("ABACATEPAY_API_KEY")

def criar_pagamento(pedido, metodo_pagamento) -> Tuple[Optional[Dict], Optional[str]]:
    """
    Cria um pagamento na API do AbacatePay
    Retorna: (dados_response, mensagem_erro)
    """
    try:
        payload = {
            "valor": float(pedido.total_final),
            "moeda": "BRL",
            "descricao": f"Pedido {pedido.numero_pedido}",
            "metodo": metodo_pagamento.tipo,
            "cliente": {
                "nome": pedido.usuario.get_full_name(),
                "email": pedido.usuario.email
            },
            "callback_url": f"{os.getenv('SITE_URL')}/pagamento/abacatepay/webhook/"
        }
        
        headers = {
            "Authorization": f"Bearer {ABACATEPAY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{ABACATEPAY_API_URL}/pagamentos", 
            json=payload, 
            headers=headers,
            timeout=30
        )
        
        response.raise_for_status()
        return response.json(), None  # ✅ Sucesso: (dados, None)
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Erro na API AbacatePay: {str(e)}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"Erro inesperado: {str(e)}"
        logger.error(error_msg)
        return None, error_msg