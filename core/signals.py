# core/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import F
from models.inventory import Estoque, MovimentacaoEstoque
from models.produto import Produto

def atualizar_estoque_cache(produto: Produto):
    """
    Atualiza o campo Produto.estoque com base no Estoque real
    """
    try:
        estoque_real = Estoque.objects.get(produto=produto)
        produto.estoque = estoque_real.quantidade
        produto.save(update_fields=['estoque'])
    except Estoque.DoesNotExist:
        produto.estoque = 0
        produto.save(update_fields=['estoque'])


@receiver(post_save, sender=MovimentacaoEstoque)
def movimentacao_estoque_criada(sender, instance, **kwargs):
    """
    Atualiza Produto.estoque quando uma movimentação é criada ou alterada
    """
    estoque, created = Estoque.objects.get_or_create(produto=instance.produto)
    
    # Ajusta o estoque real
    if instance.tipo == 'entrada':
        estoque.quantidade = F('quantidade') + instance.quantidade
    elif instance.tipo == 'saida':
        estoque.quantidade = F('quantidade') - instance.quantidade
    estoque.save()
    
    # Atualiza o cache do Produto
    atualizar_estoque_cache(instance.produto)


@receiver(post_delete, sender=MovimentacaoEstoque)
def movimentacao_estoque_deletada(sender, instance, **kwargs):
    """
    Atualiza Produto.estoque se uma movimentação for deletada
    """
    estoque, created = Estoque.objects.get_or_create(produto=instance.produto)
    
    # Reverte a movimentação
    if instance.tipo == 'entrada':
        estoque.quantidade = F('quantidade') - instance.quantidade
    elif instance.tipo == 'saida':
        estoque.quantidade = F('quantidade') + instance.quantidade
    estoque.save()
    
    # Atualiza o cache do Produto
    atualizar_estoque_cache(instance.produto)
