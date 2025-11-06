from core.integrations.transportadora import JadlogAPI
import logging

logger = logging.getLogger(__name__)

class ShippingService:
    """Serviço de frete e envio com integração à Jadlog"""

    def __init__(self):
        self.api = JadlogAPI()

    def calcular_frete(self, origem, destino, peso, valor):
        """Simula o valor e prazo do frete"""
        try:
            resultado = self.api.simular_frete(origem, destino, peso, valor)
            logger.info(f"Frete simulado com sucesso: {resultado}")
            
            # Normaliza a resposta
            return self._normalizar_simulacao(resultado)
            
        except Exception as e:
            logger.error(f"Erro ao simular frete: {e}")
            return {
                "erro": str(e),
                "status": "erro",
                "valor_frete": 0,
                "prazo_dias": 0,
                "status_entrega": "erro",
                "servico": "",
                "codigo_rastreio": "",
                "url_rastreio": ""
            }

    def criar_envio(self, pedido_id, origem, destino, peso, valor, nome_cliente):
        """Cria o envio real na Jadlog"""
        try:
            resultado = self.api.criar_envio(pedido_id, origem, destino, peso, valor, nome_cliente)
            logger.info(f"Envio criado com sucesso: {resultado}")
            
            # Normaliza a resposta
            return self._normalizar_envio(resultado, pedido_id)
            
        except Exception as e:
            logger.error(f"Erro ao criar envio: {e}")
            return {
                "erro": str(e),
                "status_entrega": "erro",
                "codigo_rastreio": "",
                "valor_frete": 0,
                "prazo_dias": 0,
                "servico": "",
                "url_rastreio": "",
                "pedido_id": pedido_id
            }

    def rastrear(self, numero_jadlog):
        """Consulta o status de rastreamento"""
        try:
            resultado = self.api.rastrear_pedido(numero_jadlog)
            logger.info(f"Rastreamento obtido: {resultado}")
            
            # Normaliza a resposta
            return self._normalizar_rastreamento(resultado, numero_jadlog)
            
        except Exception as e:
            logger.error(f"Erro ao rastrear pedido {numero_jadlog}: {e}")
            return {
                "erro": str(e),
                "status": "erro",
                "numero_rastreio": numero_jadlog,
                "status_entrega": "erro",
                "historico": []
            }

    def _normalizar_simulacao(self, resultado):
        """Normaliza a resposta da simulação de frete"""
        if "erro" in resultado:
            return resultado
        
        if "consulta" in resultado and resultado["consulta"]:
            dados = resultado["consulta"][0]
            return {
                "valor_frete": float(dados.get("frete", 0)),
                "prazo_dias": int(dados.get("prazo", 5)),
                "status_entrega": "simulado",
                "servico": dados.get("servico", "Jadlog Expresso"),
                "codigo_rastreio": "",
                "url_rastreio": "",
                "erro": None,
                "status": "sucesso"
            }
        else:
            return {
                "erro": "Estrutura de resposta inválida da Jadlog",
                "status": "erro",
                "valor_frete": 0,
                "prazo_dias": 0,
                "status_entrega": "erro",
                "servico": "",
                "codigo_rastreio": "",
                "url_rastreio": ""
            }

    def _normalizar_envio(self, resultado, pedido_id):
        """Normaliza a resposta da criação de envio"""
        if "erro" in resultado:
            return resultado
        
        # A estrutura exata pode variar - ajuste conforme a documentação da Jadlog
        if "pedido" in resultado and resultado["pedido"]:
            dados = resultado["pedido"][0]
            codigo_rastreio = dados.get("numero", "") or dados.get("codigo_rastreio", "")
            
            return {
                "pedido_id": pedido_id,
                "codigo_rastreio": codigo_rastreio,
                "valor_frete": float(dados.get("valor", 0)),
                "prazo_dias": int(dados.get("prazo", 5)),
                "status_entrega": "postado",
                "servico": dados.get("modalidade", "Jadlog Expresso"),
                "url_rastreio": f"https://www.jadlog.com.br/tracking/{codigo_rastreio}" if codigo_rastreio else "",
                "erro": None,
                "status": "sucesso"
            }
        else:
            return {
                "erro": "Estrutura de resposta inválida da Jadlog",
                "status": "erro",
                "pedido_id": pedido_id,
                "codigo_rastreio": "",
                "valor_frete": 0,
                "prazo_dias": 0,
                "status_entrega": "erro",
                "servico": "",
                "url_rastreio": ""
            }

    def _normalizar_rastreamento(self, resultado, numero_jadlog):
        """Normaliza a resposta do rastreamento"""
        if "erro" in resultado:
            return resultado
        
        # A estrutura exata pode variar - ajuste conforme a documentação da Jadlog
        if "tracking" in resultado and resultado["tracking"]:
            dados = resultado["tracking"][0]
            historico = dados.get("historico", []) if isinstance(dados.get("historico"), list) else []
            
            return {
                "numero_rastreio": numero_jadlog,
                "status_entrega": dados.get("status", "em_transito"),
                "ultimo_status": historico[0].get("status", "") if historico else "",
                "data_ultima_atualizacao": historico[0].get("data", "") if historico else "",
                "historico": historico,
                "erro": None,
                "status": "sucesso"
            }
        else:
            return {
                "erro": "Estrutura de rastreamento inválida da Jadlog",
                "status": "erro",
                "numero_rastreio": numero_jadlog,
                "status_entrega": "nao_encontrado",
                "historico": []
            }