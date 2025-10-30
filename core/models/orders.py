from django.db import models
from django.utils import timezone
from .base import BaseModel
from .user import User
from .produto import Produto

class StatusPedido(models.Model):
    nome = models.CharField(max_length=50)
    cor = models.CharField(max_length=7, default='#6B7280')
    ordem = models.IntegerField(default=0)
    is_final = models.BooleanField(default=False)

    class Meta:
        ordering = ['ordem']

    def __str__(self):
        return self.nome


class Pedido(BaseModel):
    numero_pedido = models.CharField(max_length=20, unique=True, editable=False)
    usuario = models.ForeignKey(User, on_delete=models.PROTECT, related_name='pedidos')
    status = models.ForeignKey(StatusPedido, on_delete=models.PROTECT)
    total_produtos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_descontos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_frete = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_final = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    endereco_entrega = models.JSONField()
    canal_venda = models.CharField(max_length=50, default='site')
    tags = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['numero_pedido']),
            models.Index(fields=['status', 'criado_em']),
            models.Index(fields=['usuario', 'criado_em']),
        ]

    def save(self, *args, **kwargs):
        if not self.numero_pedido:
            timestamp = timezone.now().strftime('%y%m%d%H%M%S')
            self.numero_pedido = f"ORD{timestamp}"
        self.calcular_totais()
        super().save(*args, **kwargs)

    def calcular_totais(self):
        if hasattr(self, 'itens'):
            self.total_produtos = sum(item.subtotal for item in self.itens.all())
            self.total_final = self.total_produtos - self.total_descontos + self.total_frete


class ItemPedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.PositiveIntegerField()
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.quantidade * self.preco_unitario
