from django.db import models
from .base import BaseModel
from .orders import Pedido

class Transportadora(BaseModel):
    nome = models.CharField(max_length=100)
    codigo = models.CharField(max_length=50)
    config = models.JSONField(default=dict)
    suporta_cotacao = models.BooleanField(default=True)
    suporta_rastreio = models.BooleanField(default=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Transportadora"
        verbose_name_plural = "Transportadoras"

    def __str__(self):
        return self.nome


class Envio(BaseModel):
    pedido = models.OneToOneField(Pedido, on_delete=models.PROTECT, related_name='envio')
    transportadora = models.ForeignKey(Transportadora, on_delete=models.PROTECT)
    valor_frete = models.DecimalField(max_digits=10, decimal_places=2)
    prazo_dias = models.IntegerField()
    servico = models.CharField(max_length=100)
    codigo_rastreio = models.CharField(max_length=100, blank=True)
    url_rastreio = models.URLField(blank=True)
    status_entrega = models.CharField(max_length=50, default='pendente')
    
    # Campo MANTIDO - crucial para histórico de rastreamento
    eventos_rastreio = models.JSONField(
        default=list,
        help_text="Histórico completo de eventos de rastreamento da transportadora"
    )
    
    # Campos adicionais para melhor controle
    data_postagem = models.DateTimeField(blank=True, null=True)
    data_entrega = models.DateTimeField(blank=True, null=True)
    ultima_atualizacao = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Envio"
        verbose_name_plural = "Envios"
        indexes = [
            models.Index(fields=['codigo_rastreio']),
            models.Index(fields=['status_entrega']),
            models.Index(fields=['data_postagem']),
        ]

    def __str__(self):
        return f"Envio {self.pedido.numero_pedido} - {self.transportadora.nome}"

    def atualizar_rastreamento(self, eventos):
        """
        Atualiza os eventos de rastreamento
        Args:
            eventos (list): Lista de eventos de rastreamento
        """
        if eventos and isinstance(eventos, list):
            self.eventos_rastreio = eventos
            
            # Atualizar status baseado no último evento
            if eventos:
                ultimo_evento = eventos[0]  # Assumindo que o mais recente é o primeiro
                self.status_entrega = ultimo_evento.get('status', self.status_entrega)
                
                # Tentar extrair data do último evento
                if 'data' in ultimo_evento:
                    try:
                        # Aqui você pode converter a string de data se necessário
                        pass
                    except:
                        pass
            
            self.save()

    @property
    def ultimo_evento(self):
        """Retorna o último evento de rastreamento"""
        if self.eventos_rastreio:
            return self.eventos_rastreio[0]
        return None

    @property
    def tempo_transcorrido(self):
        """Calcula o tempo desde a postagem"""
        if self.data_postagem:
            from django.utils import timezone
            return timezone.now() - self.data_postagem
        return None