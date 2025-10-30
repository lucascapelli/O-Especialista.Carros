from django.db import models
from .base import BaseModel
from .orders import Pedido

class Transportadora(BaseModel):
    nome = models.CharField(max_length=100)
    codigo = models.CharField(max_length=50)
    config = models.JSONField(default=dict)
    suporta_cotacao = models.BooleanField(default=True)
    suporta_rastreio = models.BooleanField(default=True)

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
    eventos_rastreio = models.JSONField(default=list)
