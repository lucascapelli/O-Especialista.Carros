from django.db import models
from .user import User
from .produto import Produto

class Carrinho(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='carrinho', null=True, blank=True)
    sessao = models.CharField(max_length=100, blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Carrinho'
        verbose_name_plural = 'Carrinhos'

    def __str__(self):
        if self.usuario:
            return f'Carrinho de {self.usuario.email}'
        return f'Carrinho Sessão {self.sessao}'

    @property
    def total_itens(self):
        return self.itens.aggregate(total=models.Sum('quantidade'))['total'] or 0

    @property
    def total_preco(self):
        return sum(item.subtotal for item in self.itens.all())


class ItemCarrinho(models.Model):
    carrinho = models.ForeignKey(Carrinho, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    quantidade = models.PositiveIntegerField(default=1)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Item do Carrinho'
        verbose_name_plural = 'Itens do Carrinho'
        unique_together = ['carrinho', 'produto']

    def __str__(self):
        return f'{self.quantidade}x {self.produto.nome}'

    @property
    def subtotal(self):
        return self.quantidade * self.preco_unitario
