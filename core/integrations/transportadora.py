import os
import requests
from dotenv import load_dotenv

load_dotenv()

JADLOG_API_URL = os.getenv("JADLOG_API_URL")
JADLOG_TOKEN = os.getenv("JADLOG_TOKEN")
JADLOG_CODREM = os.getenv("JADLOG_CODREM")


class JadlogAPI:
    """Integração com a API da Jadlog"""

    def __init__(self):
        if not all([JADLOG_API_URL, JADLOG_TOKEN, JADLOG_CODREM]):
            raise ValueError("Credenciais da Jadlog não configuradas corretamente.")
        self.base_url = JADLOG_API_URL
        self.headers = {
            "Authorization": f"Bearer {JADLOG_TOKEN}",
            "Content-Type": "application/json",
        }

    def _make_request(self, url, payload):
        """Método interno para fazer requisições com tratamento de erros"""
        resp = requests.post(url, json=payload, headers=self.headers)
        resp.raise_for_status()
        try:
            return resp.json()
        except ValueError:
            return {"erro": "Resposta inválida da Jadlog", "raw": resp.text}

    def simular_frete(self, origem, destino, peso, valor):
        """
        Simula o valor e prazo do frete.
        Espera origem e destino como dicionários contendo pelo menos 'cep'.
        """
        url = f"{self.base_url}/frete/simular"
        payload = {
            "consulta": [
                {
                    "cepOrigem": origem.get("cep"),
                    "cepDestino": destino.get("cep"),
                    "peso": peso,
                    "valorDeclarado": valor,
                    "modalidade": "EXP",  # EXP = Expresso, ROD = Rodoviário
                    "codRem": JADLOG_CODREM
                }
            ]
        }
        return self._make_request(url, payload)

    def criar_envio(self, pedido_id, origem, destino, peso, valor, nome_cliente):
        """
        Cria um pedido (envio) na Jadlog.
        Espera origem e destino como dicionários contendo pelo menos 'cep' e 'nome'.
        """
        url = f"{self.base_url}/pedido/incluir"
        payload = {
            "codRem": JADLOG_CODREM,
            "pedido": [
                {
                    "pedido": str(pedido_id),
                    "modalidade": "EXP",
                    "peso": peso,
                    "valor": valor,
                    "vlrColeta": 0,
                    "rem": {"cep": origem.get("cep")},
                    "des": {
                        "nome": nome_cliente or destino.get("nome"),
                        "cep": destino.get("cep")
                    }
                }
            ]
        }
        return self._make_request(url, payload)

    def rastrear_pedido(self, numero_jadlog):
        """Consulta o rastreamento de um pedido Jadlog."""
        url = f"{self.base_url}/tracking/consultar"
        payload = {"consulta": [numero_jadlog]}
        return self._make_request(url, payload)