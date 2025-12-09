# core/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import F

from core.models import Avaliacao, MidiaAvaliacao
from core.models.inventory import Estoque, MovimentacaoEstoque
from core.models.produto import Produto
from core.tasks.avaliacao_tasks import processar_midia_avaliacao, processar_moderacao_avaliacao

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
def movimentacao_estoque_criada(sender, instance, created, **kwargs):
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


# =============================
# Signals para Avaliações e Mídias
# =============================

@receiver(post_save, sender=Avaliacao)
def disparar_moderacao_avaliacao(sender, instance, created, **kwargs):
    """
    Dispara task de moderação quando uma Avaliacao é criada ou atualizada
    """
    # Só dispara para avaliações pendentes (que ainda não foram moderadas)
    if instance.status == 'pendente':
        processar_moderacao_avaliacao.delay(instance.id)
        # Log para debug
        from django.conf import settings
        if settings.DEBUG:
            print(f"[SIGNAL] Task de moderação disparada para avaliação {instance.id}")


@receiver(post_save, sender=MidiaAvaliacao)
def disparar_processamento_midia(sender, instance, created, **kwargs):
    """
    Dispara task de processamento quando uma MidiaAvaliacao é criada
    """
    # Só processa se ainda não foi aprovada/rejeitada
    if not instance.aprovado and instance.motivo_rejeicao is None:
        processar_midia_avaliacao.delay(instance.id)
        # Log para debug
        from django.conf import settings
        if settings.DEBUG:
            print(f"[SIGNAL] Task de mídia disparada para mídia {instance.id}")


# =============================
# Signal para invalidar cache de estatísticas
# =============================
@receiver(post_save, sender=Avaliacao)
@receiver(post_delete, sender=Avaliacao)
def invalidar_cache_estatisticas(sender, instance, **kwargs):
    """
    Invalida o cache de estatísticas quando uma avaliação é alterada
    """
    from django.core.cache import cache
    from core.models.avaliacoes import Avaliacao
    
    # Invalida cache específico do produto
    cache_key = f"avaliacao_stats_prod_{instance.produto_id}"
    cache.delete(cache_key)
    
    # Opcional: recalcula as estatísticas em background
    try:
        Avaliacao.objects.recalc_cache_for_produto(instance.produto_id)
    except Exception as e:
        # Fail silently em produção, log em debug
        from django.conf import settings
        if settings.DEBUG:
            print(f"[SIGNAL] Erro ao recalcular cache: {e}")