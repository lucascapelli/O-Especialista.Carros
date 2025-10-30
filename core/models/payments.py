from django.db import models
from .base import BaseModel
from .orders import Pedido

class MetodoPagamento(BaseModel):
    TIPOS = [
        ('cartao', 'Cartão de Crédito'),
        ('pix', 'PIX'),
        ('boleto', 'Boleto'),
        ('debito', 'Cartão de Débito'),
    ]
    nome = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPOS)
    config = models.JSONField(default=dict)

    def __str__(self):
        return self.nome


class Pagamento(BaseModel):
    STATUS = [
        ('pendente', 'Pendente'),
        ('processando', 'Processando'),
        ('aprovado', 'Aprovado'),
        ('recusado', 'Recusado'),
        ('estornado', 'Estornado'),
    ]
    pedido = models.OneToOneField(Pedido, on_delete=models.PROTECT, related_name='pagamento')
    metodo = models.ForeignKey(MetodoPagamento, on_delete=models.PROTECT)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS, default='pendente')
    id_transacao = models.CharField(max_length=100, blank=True)
    dados_transacao = models.JSONField(default=dict)
    codigo_pagamento = models.CharField(max_length=300, blank=True)
    data_expiracao = models.DateTimeField(null=True, blank=True)
