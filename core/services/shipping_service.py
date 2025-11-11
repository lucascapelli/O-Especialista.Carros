from core.integrations.transportadora import JadlogAPI
import logging

logger = logging.getLogger(__name__)

class ShippingService:
    """Serviço de frete e envio com integração à Jadlog"""

    def __init__(self):
        self.api = JadlogAPI()

    def calcular_frete(self, origem_cep, destino_cep, itens_pedido):
        """
        Simula o valor e prazo do frete baseado nos itens do pedido
        
        Args:
            origem_cep (str): CEP de origem
            destino_cep (str): CEP de destino
            itens_pedido (list): Lista de itens do pedido com dimensões
        """
        try:
            # Processar itens para calcular totais e gerar volumes
            peso_total, valor_total, volumes = self._processar_itens_pedido(itens_pedido)
            
            logger.info(f"Calculando frete: {origem_cep} -> {destino_cep}, "
                       f"Peso: {peso_total}kg, Valor: R${valor_total}, "
                       f"Volumes: {len(volumes)}")
            
            resultado = self.api.simular_frete(origem_cep, destino_cep, peso_total, valor_total, volumes)
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

    def _processar_itens_pedido(self, itens_pedido):
        """
        Processa os itens do pedido para calcular totais e gerar volumes
        
        Args:
            itens_pedido (list): Lista de itens com quantidade e dimensões
            
        Returns:
            tuple: (peso_total, valor_total, volumes)
        """
        peso_total = 0.0
        valor_total = 0.0
        volumes = []
        
        for item in itens_pedido:
            quantidade = item.get('quantidade', 1)
            peso_item = item.get('peso', 0) * quantidade
            valor_item = item.get('valor', 0) * quantidade
            
            peso_total += peso_item
            valor_total += valor_item
            
            # Criar um volume para cada unidade do item
            for i in range(quantidade):
                volume = {
                    "peso": item.get('peso', 0),
                    "altura": item.get('altura', 0),
                    "largura": item.get('largura', 0),
                    "comprimento": item.get('comprimento', 0),
                    "valor": item.get('valor', 0)
                }
                volumes.append(volume)
        
        # Garantir valores mínimos
        if peso_total < 0.1:
            peso_total = 0.1
            
        return peso_total, valor_total, volumes

    def criar_envio(self, pedido_obj):
        """
        Cria o envio real na Jadlog com dados completos do pedido
        
        Args:
            pedido_obj: Objeto Pedido com todos os dados necessários
        """
        try:
            # Validar se o pedido tem dados completos para envio
            valido, mensagem = pedido_obj.validar_para_envio()
            if not valido:
                return {
                    "erro": f"Pedido não está válido para envio: {mensagem}",
                    "status_entrega": "erro",
                    "codigo_rastreio": "",
                    "valor_frete": 0,
                    "prazo_dias": 0,
                    "servico": "",
                    "url_rastreio": "",
                    "pedido_id": pedido_obj.id
                }
            
            # Obter dados completos do pedido
            dados_envio = self._montar_dados_envio(pedido_obj)
            
            logger.info(f"Criando envio para pedido {pedido_obj.id}")
            
            resultado = self.api.criar_envio(dados_envio)
            logger.info(f"Envio criado com sucesso: {resultado}")
            
            # Normaliza a resposta
            return self._normalizar_envio(resultado, pedido_obj.id)
            
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
                "pedido_id": pedido_obj.id
            }

    def _montar_dados_envio(self, pedido_obj):
        """
        Monta os dados completos para envio a partir do objeto Pedido
        
        Args:
            pedido_obj: Objeto Pedido com relacionamentos
            
        Returns:
            dict: Payload completo para a API Jadlog
        """
        # Obter dados do remetente (configurações da loja)
        remetente = self._obter_dados_remetente()
        
        # Obter dados do destinatário
        destinatario = self._obter_dados_destinatario(pedido_obj)
        
        # Processar itens para volumes
        peso_total, valor_total, volumes = self._processar_itens_pedido(
            self._itens_para_lista(pedido_obj.itens.all())
        )
        
        # Obter dados fiscais
        dados_nf = self._obter_dados_fiscais(pedido_obj)
        
        # Construir payload usando o método auxiliar da API
        payload = self.api.construir_payload_envio(
            pedido_id=pedido_obj.id,
            remetente=remetente,
            destinatario=destinatario,
            volumes=volumes,
            dados_nf=dados_nf,
            modalidade="EXP"  # ou definir baseado em configurações
        )
        
        return payload

    def _obter_dados_remetente(self):
        """
        Obtém dados do remetente (loja) das configurações do sistema
        
        Returns:
            dict: Dados do remetente
        """
        # TODO: Implementar busca das configurações da loja
        # Por enquanto, retornar dados padrão ou do .env
        from django.conf import settings
        
        return {
            "cnpj_cpf": getattr(settings, 'LOJA_CNPJ', '12345678000199'),
            "nome": getattr(settings, 'LOJA_NOME', 'Minha Loja LTDA'),
            "endereco": getattr(settings, 'LOJA_ENDERECO', 'Rua Exemplo'),
            "numero": getattr(settings, 'LOJA_NUMERO', '123'),
            "complemento": getattr(settings, 'LOJA_COMPLEMENTO', 'Sala 1'),
            "bairro": getattr(settings, 'LOJA_BAIRRO', 'Centro'),
            "cidade": getattr(settings, 'LOJA_CIDADE', 'São Paulo'),
            "uf": getattr(settings, 'LOJA_UF', 'SP'),
            "cep": getattr(settings, 'LOJA_CEP', '01001000'),
            "telefone": getattr(settings, 'LOJA_TELEFONE', '11999999999')
        }

    def _obter_dados_destinatario(self, pedido_obj):
        """
        Obtém dados do destinatário do endereço de entrega do pedido
        
        Args:
            pedido_obj: Objeto Pedido
            
        Returns:
            dict: Dados do destinatário
        """
        endereco = pedido_obj.endereco_entrega
        
        # CORREÇÃO CRÍTICA: Usar .get() para acessar dicionário JSONField
        # em vez de getattr() que é para objetos Django
        nome_cliente = (
            endereco.get('nome_completo', '') or 
            getattr(pedido_obj.usuario, 'get_full_name', lambda: '')() or
            getattr(pedido_obj.usuario, 'nome', '')
        )
        
        telefone = (
            endereco.get('telefone', '') or 
            getattr(pedido_obj, 'cliente_telefone', '') or
            getattr(pedido_obj.usuario, 'telefone', '')
        )
        
        return {
            "cnpj_cpf": pedido_obj.cpf_destinatario or endereco.get('cpf', '') or endereco.get('cnpj', ''),
            "nome": nome_cliente or "Cliente Não Identificado",
            "endereco": endereco.get('logradouro', ''),
            "numero": endereco.get('numero', ''),
            "complemento": endereco.get('complemento', ''),
            "bairro": endereco.get('bairro', ''),
            "cidade": endereco.get('cidade', ''),
            "uf": endereco.get('estado', ''),
            "cep": endereco.get('cep', ''),
            "telefone": telefone
        }

    def _obter_dados_fiscais(self, pedido_obj):
        """
        Obtém dados fiscais do pedido
        
        Args:
            pedido_obj: Objeto Pedido
            
        Returns:
            dict: Dados fiscais
        """
        # TODO: Implementar busca de dados fiscais reais
        # Por enquanto, retornar dados básicos
        return {
            "cfop": "6101",  # CFOP para venda interestadual
            "tipo": "N",     # N = Normal
            "numero": str(pedido_obj.id).zfill(6),
            "serie": "1",
            "valor": float(pedido_obj.valor_total)
        }

    def _itens_para_lista(self, itens_queryset):
        """
        Converte queryset de itens para lista de dicionários
        
        Args:
            itens_queryset: QuerySet de itens do pedido
            
        Returns:
            list: Lista de itens processados
        """
        itens_lista = []
        
        for item in itens_queryset:
            itens_lista.append({
                'quantidade': item.quantidade,
                'peso': float(item.produto.peso or 0.1),
                'altura': float(item.produto.altura or 1),
                'largura': float(item.produto.largura or 1),
                'comprimento': float(item.produto.comprimento or 1),
                'valor': float(item.preco_unitario)
            })
        
        return itens_lista

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
        """
        Normaliza a resposta da criação de envio
        AJUSTE CRÍTICO: Extrair corretamente o código de rastreio da resposta Jadlog
        """
        if "erro" in resultado:
            return resultado
        
        # Estrutura de resposta da Jadlog pode variar - ajustar conforme documentação
        codigo_rastreio = ""
        
        # Tentar diferentes possíveis locais do código de rastreio
        if "pedido" in resultado and resultado["pedido"]:
            dados_pedido = resultado["pedido"][0]
            
            # Possíveis campos onde o código de rastreio pode estar
            codigo_rastreio = (
                dados_pedido.get("shipmentId") or
                dados_pedido.get("numero") or
                dados_pedido.get("codigo") or
                dados_pedido.get("codigo_rastreio") or
                dados_pedido.get("tracking_number") or
                ""
            )
            
            # Se ainda não encontrou, tentar na raiz do resultado
            if not codigo_rastreio:
                codigo_rastreio = (
                    resultado.get("shipmentId") or
                    resultado.get("numero") or
                    resultado.get("codigo_rastreio") or
                    ""
                )
        
        logger.info(f"Código de rastreio extraído: {codigo_rastreio}")
        
        if codigo_rastreio:
            return {
                "pedido_id": pedido_id,
                "codigo_rastreio": codigo_rastreio,
                "valor_frete": float(resultado.get("valor", 0)),
                "prazo_dias": int(resultado.get("prazo", 5)),
                "status_entrega": "postado",
                "servico": resultado.get("modalidade", "Jadlog Expresso"),
                "url_rastreio": f"https://www.jadlog.com.br/tracking/{codigo_rastreio}",
                "erro": None,
                "status": "sucesso",
                "dados_completos": resultado  # Incluir resposta completa para debug
            }
        else:
            return {
                "erro": "Não foi possível obter código de rastreio da Jadlog",
                "status": "erro",
                "pedido_id": pedido_id,
                "codigo_rastreio": "",
                "valor_frete": 0,
                "prazo_dias": 0,
                "status_entrega": "erro",
                "servico": "",
                "url_rastreio": "",
                "dados_completos": resultado  # Incluir resposta completa para debug
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