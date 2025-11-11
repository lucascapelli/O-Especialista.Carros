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

    def _make_request(self, url, payload=None, method="POST"):
        """Método interno para fazer requisições com tratamento de erros"""
        try:
            if method.upper() == "POST":
                resp = requests.post(url, json=payload, headers=self.headers)
            else:
                resp = requests.get(url, headers=self.headers)
            
            resp.raise_for_status()
            
            if resp.status_code == 204:  # No content
                return {"sucesso": True}
                
            try:
                return resp.json()
            except ValueError:
                return {"erro": "Resposta inválida da Jadlog", "raw": resp.text}
                
        except requests.exceptions.RequestException as e:
            return {"erro": f"Erro na requisição: {str(e)}"}

    def simular_frete(self, origem_cep, destino_cep, peso_total, valor_total, volumes):
        """
        Simula o valor e prazo do frete.
        
        Args:
            origem_cep (str): CEP de origem
            destino_cep (str): CEP de destino
            peso_total (float): Peso total em kg
            valor_total (float): Valor total declarado
            volumes (list): Lista de dicionários com dimensões dos volumes
                [{"peso": 1.0, "altura": 10, "largura": 20, "comprimento": 30}, ...]
        """
        url = f"{self.base_url}/frete/simular"
        
        # Converter volumes para o formato esperado pela Jadlog
        volumes_jadlog = []
        for volume in volumes:
            volumes_jadlog.append({
                "peso": volume.get("peso", peso_total),
                "altura": volume.get("altura", 0),
                "largura": volume.get("largura", 0),
                "comprimento": volume.get("comprimento", 0)
            })
        
        payload = {
            "consulta": [
                {
                    "cepOrigem": origem_cep,
                    "cepDestino": destino_cep,
                    "peso": peso_total,
                    "valorDeclarado": valor_total,
                    "modalidade": "EXP",  # EXP = Expresso, ROD = Rodoviário
                    "codRem": JADLOG_CODREM,
                    "volumes": volumes_jadlog
                }
            ]
        }
        return self._make_request(url, payload)

    def criar_envio(self, payload_completo):
        """
        Cria um pedido (envio) na Jadlog com payload completo.
        
        Args:
            payload_completo (dict): Estrutura completa conforme documentação da Jadlog
                Exemplo:
                {
                    "codRem": "SEU_CODREM",
                    "pedido": [
                        {
                            "pedido": "12345",
                            "modalidade": "EXP",
                            "tpColeta": "P",
                            "vlrColeta": 0,
                            "rem": {
                                "cnpjCpf": "12345678901",
                                "nome": "Nome Remetente",
                                "end": "Endereço Remetente",
                                "num": "123",
                                "bairro": "Bairro Remetente",
                                "cidade": "Cidade Remetente",
                                "uf": "SP",
                                "cep": "01001000"
                            },
                            "des": {
                                "cnpjCpf": "10987654321",
                                "nome": "Nome Destinatário",
                                "end": "Endereço Destinatário",
                                "num": "456",
                                "bairro": "Bairro Destinatário",
                                "cidade": "Cidade Destinatário",
                                "uf": "RJ",
                                "cep": "20010000"
                            },
                            "volumes": [
                                {
                                    "peso": 1.0,
                                    "altura": 10,
                                    "largura": 20,
                                    "comprimento": 30,
                                    "valor": 50.0
                                }
                            ],
                            "dfe": {
                                "cfop": "6101",
                                "tipo": "N",
                                "numero": "12345",
                                "serie": "1",
                                "valor": 100.0
                            }
                        }
                    ]
                }
        """
        url = f"{self.base_url}/pedido/incluir"
        
        # Garantir que o codRem está incluído no payload
        if "codRem" not in payload_completo:
            payload_completo["codRem"] = JADLOG_CODREM
            
        return self._make_request(url, payload_completo)

    def rastrear_pedido(self, numero_jadlog):
        """
        Consulta o rastreamento de um pedido Jadlog.
        
        Args:
            numero_jadlog (str): Número do pedido/shipment da Jadlog
        """
        # Verificar se é necessário usar POST ou GET conforme documentação atual
        # Ajuste conforme a versão da API da Jadlog
        url = f"{self.base_url}/tracking/consultar"
        payload = {"consulta": [numero_jadlog]}
        
        return self._make_request(url, payload)

    # Método auxiliar para construir payload de envio
    def construir_payload_envio(self, pedido_id, remetente, destinatario, volumes, dados_nf=None, modalidade="EXP"):
        """
        Método auxiliar para construir o payload completo para criação de envio.
        
        Args:
            pedido_id (str): ID do pedido
            remetente (dict): Dados completos do remetente
            destinatario (dict): Dados completos do destinatário
            volumes (list): Lista de volumes
            dados_nf (dict, optional): Dados da nota fiscal
            modalidade (str): Modalidade de frete (EXP, ROD, etc.)
        """
        payload = {
            "codRem": JADLOG_CODREM,
            "pedido": [
                {
                    "pedido": str(pedido_id),
                    "modalidade": modalidade,
                    "tpColeta": "P",  # P = Próprio, C = Jadlog
                    "vlrColeta": 0,
                    "rem": {
                        "cnpjCpf": remetente.get("cnpj_cpf", ""),
                        "nome": remetente.get("nome", ""),
                        "end": remetente.get("endereco", ""),
                        "num": remetente.get("numero", ""),
                        "compl": remetente.get("complemento", ""),
                        "bairro": remetente.get("bairro", ""),
                        "cidade": remetente.get("cidade", ""),
                        "uf": remetente.get("uf", ""),
                        "cep": remetente.get("cep", ""),
                        "tel": remetente.get("telefone", "")
                    },
                    "des": {
                        "cnpjCpf": destinatario.get("cnpj_cpf", ""),
                        "nome": destinatario.get("nome", ""),
                        "end": destinatario.get("endereco", ""),
                        "num": destinatario.get("numero", ""),
                        "compl": destinatario.get("complemento", ""),
                        "bairro": destinatario.get("bairro", ""),
                        "cidade": destinatario.get("cidade", ""),
                        "uf": destinatario.get("uf", ""),
                        "cep": destinatario.get("cep", ""),
                        "tel": destinatario.get("telefone", "")
                    },
                    "volumes": volumes
                }
            ]
        }
        
        # Adicionar dados da nota fiscal se fornecidos
        if dados_nf:
            payload["pedido"][0]["dfe"] = {
                "cfop": dados_nf.get("cfop", "6101"),
                "tipo": dados_nf.get("tipo", "N"),  # N = Normal
                "numero": dados_nf.get("numero", ""),
                "serie": dados_nf.get("serie", "1"),
                "valor": dados_nf.get("valor", 0)
            }
            
        return payload