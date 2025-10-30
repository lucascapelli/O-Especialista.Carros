from django.db import models
from .base import BaseModel
from .produto import Produto

class Estoque(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name='estoque_real'  # <- aqui
    )
    quantidade = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.produto.nome} - {self.quantidade} un."

class MovimentacaoEstoque(BaseModel):
    TIPOS = [
        ('entrada', 'Entrada'),
        ('saida', 'Saída'),
    ]
    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name='movimentacoes_estoque'
    )
    tipo = models.CharField(max_length=10, choices=TIPOS)
    quantidade = models.IntegerField()
    motivo = models.CharField(max_length=255, blank=True)
