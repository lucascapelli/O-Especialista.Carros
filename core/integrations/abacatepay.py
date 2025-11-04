# core/integrations/abacatepay.py
import logging
import requests
from typing import Dict, Optional, Tuple
from django.conf import settings

logger = logging.getLogger(__name__)

def criar_pagamento(pedido, metodo_pagamento) -> Tuple[Optional[Dict], Optional[str]]:
    """
    Cria um pagamento na API do AbacatePay
    Retorna: (dados_response, mensagem_erro)
    """
    try:
        # Corrigir: get_full_name pode não existir, usar first_name + last_name
        nome_cliente = f"{pedido.usuario.first_name} {pedido.usuario.last_name}".strip()
        if not nome_cliente:
            nome_cliente = pedido.usuario.email.split('@')[0]  # fallback

        payload = {
            "valor": float(pedido.total_final),
            "moeda": "BRL",
            "descricao": f"Pedido {pedido.numero_pedido}",
            "metodo": metodo_pagamento.tipo,
            "cliente": {
                "nome": nome_cliente,
                "email": pedido.usuario.email
            },
            "callback_url": f"{settings.SITE_URL}/pagamento/abacatepay/webhook/"
        }

        headers = {
            "Authorization": f"Bearer {settings.ABACATEPAY_API_KEY}",
            "Content-Type": "application/json"
        }

        logger.info(f"Enviando pagamento para AbacatePay: {payload}")

        response = requests.post(
            f"{settings.ABACATEPAY_API_URL}/pagamentos",
            json=payload,
            headers=headers,
            timeout=30
        )

        response.raise_for_status()
        data = response.json()
        logger.info(f"Resposta AbacatePay: {data}")
        return data, None

    except requests.exceptions.RequestException as e:
        error_msg = f"Erro na API AbacatePay: {str(e)}"
        logger.error(error_msg)
        return None, error_msg
    except Exception as e:
        error_msg = f"Erro inesperado: {str(e)}"
        logger.error(error_msg)
        return None, error_msg