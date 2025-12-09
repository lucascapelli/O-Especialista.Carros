# core/models/avaliacoes.py
import uuid
import hashlib
import logging

from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import models, transaction, IntegrityError
from django.db.models import Q, Avg, Count, Sum, FloatField
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError  # ADICIONAR ESSA LINHA
from django.utils import timezone

logger = logging.getLogger(__name__)


def upload_to_avaliacao(instance, filename):
    """Estrutura otimizada para armazenamento S3/CDN"""
    ext = filename.split('.')[-1].lower()
    filename = f"{uuid.uuid4().hex[:12]}.{ext}"
    # note: instance.avaliacao pode existir apenas quando a mídia for criada após a avaliação
    produto_id = getattr(getattr(instance, "avaliacao", None), "produto_id", "unknown")
    return f'avaliacoes/prod_{produto_id}/{timezone.now().strftime("%Y/%m")}/{filename}'


# -----------------------
# Avaliação (QuerySet/Manager)
# -----------------------
class AvaliacaoQuerySet(models.QuerySet):
    def publicas(self):
        """Avaliações aprovadas (visíveis para a loja)"""
        return self.filter(status='aprovado')

    def aprovadas(self):
        return self.filter(status='aprovado')

    def com_midia(self):
        return self.filter(midias__isnull=False).distinct()

    def por_produto_usuario(self, produto_id, usuario_id):
        return self.filter(produto_id=produto_id, usuario_id=usuario_id).first()

    # ---------- Estatísticas / Agregações ----------
    def stats_for_product(self, produto_id, cache_ttl=60):
        """
        Retorna dict: { total, media, soma_notas, por_estrela: {1:cnt,...} }
        Cache curto por produto (ajustável via cache_ttl).
        """
        cache_key = f"avaliacao_stats_prod_{produto_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        qs = self.filter(produto_id=produto_id, status='aprovado')
        agg = qs.aggregate(
            total=Count('id'),
            media=Avg('nota_geral'),
            soma_notas=Sum('nota_geral')
        )
        # distribuição por estrela (1..5)
        dist_qs = qs.values('nota_geral').annotate(count=Count('id')).order_by('nota_geral')
        por_estrela = {i: 0 for i in range(1, 6)}
        for row in dist_qs:
            try:
                por_estrela[int(row['nota_geral'])] = row['count']
            except Exception:
                continue

        result = {
            'total': int(agg['total'] or 0),
            'media': float(agg['media']) if agg['media'] is not None else None,
            'soma_notas': int(agg['soma_notas'] or 0),
            'por_estrela': por_estrela
        }
        cache.set(cache_key, result, cache_ttl)
        return result

    def rating_distribution(self, produto_id):
        """Retorna lista de tuples (nota, count) ordenada por nota asc."""
        qs = self.filter(produto_id=produto_id, status='aprovado')
        rows = qs.values('nota_geral').annotate(count=Count('id')).order_by('nota_geral')
        return [(int(r['nota_geral']), r['count']) for r in rows]

    def top_products_by_avg(self, limit=10, min_reviews=5):
        """
        Retorna lista de dicts: [{'produto': id, 'media': float, 'total': int}, ...]
        Ordenado por média desc, filtrando por min_reviews.
        """
        qs = self.filter(status='aprovado')
        agg_qs = qs.values('produto').annotate(
            media=Avg('nota_geral', output_field=FloatField()),
            total=Count('id')
        ).filter(total__gte=min_reviews).order_by('-media')[:limit]
        return [{'produto': r['produto'], 'media': float(r['media']), 'total': int(r['total'])} for r in agg_qs]

    def recent_stats(self, produto_id, days=30):
        """Estatísticas das avaliações aprovadas nos últimos `days` dias."""
        since = timezone.now() - timedelta(days=days)
        qs = self.filter(produto_id=produto_id, status='aprovado', publicado_em__gte=since)
        agg = qs.aggregate(total=Count('id'), media=Avg('nota_geral'))
        return {'total': int(agg['total'] or 0), 'media': float(agg['media']) if agg['media'] is not None else None}

    def global_stats(self):
        """Estatísticas globais do conjunto (aprovadas)."""
        qs = self.filter(status='aprovado')
        agg = qs.aggregate(total=Count('id'), media=Avg('nota_geral'))
        return {'total': int(agg['total'] or 0), 'media': float(agg['media']) if agg['media'] is not None else None}


class AvaliacaoManager(models.Manager):
    def get_queryset(self):
        return AvaliacaoQuerySet(self.model, using=self._db)

    def publicas(self):
        return self.get_queryset().publicas()

    def aprovadas(self):
        return self.get_queryset().aprovadas()

    def com_midia(self):
        return self.get_queryset().com_midia()

    def por_produto_usuario(self, produto_id, usuario_id):
        return self.get_queryset().por_produto_usuario(produto_id, usuario_id)

    # Wrappers de estatísticas
    def stats_for_product(self, produto_id, cache_ttl=60):
        return self.get_queryset().stats_for_product(produto_id, cache_ttl=cache_ttl)

    def rating_distribution(self, produto_id):
        return self.get_queryset().rating_distribution(produto_id)

    def top_products_by_avg(self, limit=10, min_reviews=5):
        return self.get_queryset().top_products_by_avg(limit=limit, min_reviews=min_reviews)

    def recent_stats(self, produto_id, days=30):
        return self.get_queryset().recent_stats(produto_id, days=days)

    def global_stats(self):
        return self.get_queryset().global_stats()


# -----------------------
# Modelo Avaliacao
# -----------------------
class Avaliacao(models.Model):
    ESTRELAS_CHOICES = [(i, str(i)) for i in range(1, 6)]
    STATUS_CHOICES = [
        ('pendente', 'Pendente de Moderação'),
        ('aprovado', 'Aprovado'),
        ('rejeitado', 'Rejeitado'),
        ('spam', 'Marcado como Spam'),
        ('oculto', 'Oculto por Moderação'),
    ]

    # Chaves estrangeiras
    produto = models.ForeignKey('core.Produto', on_delete=models.CASCADE, related_name='avaliacoes', db_index=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='avaliacoes', db_index=True)

    # Notas
    nota_geral = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Nota de 1 a 5 estrelas"
    )

    # Notas específicas (opcional)
    nota_qualidade = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)],
                                                     null=True, blank=True)
    nota_entrega = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)],
                                                    null=True, blank=True)
    nota_custo_beneficio = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)],
                                                            null=True, blank=True)

    # Conteúdo
    titulo = models.CharField(max_length=200, help_text="Título da sua avaliação")
    comentario = models.TextField(help_text="Conte sua experiência detalhada")

    # Informações úteis
    tempo_de_uso = models.CharField(max_length=50, null=True, blank=True)
    melhor_ponto = models.CharField(max_length=200, null=True, blank=True)
    pior_ponto = models.CharField(max_length=200, null=True, blank=True)
    recomendaria = models.BooleanField(default=True)

    # Status e moderação
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente', db_index=True)
    moderador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                  null=True, blank=True, related_name='avaliacoes_moderadas')
    motivo_rejeicao = models.TextField(null=True, blank=True)

    # Interações sociais (contadores cacheados)
    likes = models.PositiveIntegerField(default=0, db_index=True)
    dislikes = models.PositiveIntegerField(default=0, db_index=True)
    util = models.PositiveIntegerField(default=0, db_index=True)
    nao_util = models.PositiveIntegerField(default=0, db_index=True)
    compartilhamentos = models.PositiveIntegerField(default=0)

    # Metadados de segurança
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    user_agent = models.TextField(null=True, blank=True)
    # permite NULL para podermos tratar colisões/duplicatas antes de persistir o hash
    hash_avaliacao = models.CharField(max_length=64, blank=True, null=True, editable=False, db_index=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    publicado_em = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = AvaliacaoManager()

    class Meta:
        ordering = ['-created_at']
        constraints = [
            # Apenas constraints sem condition para MariaDB
            # UniqueConstraint(fields=['produto', 'usuario'], name='unique_avaliacao_produto_usuario'),
            # UniqueConstraint com condition REMOVIDO - não suportado pelo MariaDB
            # UniqueConstraint(fields=['hash_avaliacao'],
            #                  condition=Q(hash_avaliacao__isnull=False),
            #                  name='unique_hash_avaliacao')
        ]
        indexes = [
            models.Index(fields=['produto', 'status', 'created_at']),
            models.Index(fields=['produto', 'nota_geral']),
            models.Index(fields=['status', 'publicado_em']),
            models.Index(fields=['usuario', 'created_at']),
            # Índice único para produto+usuario (substitui a constraint)
            models.Index(fields=['produto', 'usuario'], name='idx_unique_prod_user'),
        ]
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'

    def __str__(self):
        return f"Avaliação de {self.usuario} para {getattr(self.produto, 'nome', self.produto_id)}"

    # ---- helpers ----
    @staticmethod
    def _normalize_text_for_hash(text: str) -> str:
        """Normaliza texto (lower, strip, collapse spaces) antes de hashear."""
        if not text:
            return ''
        return ' '.join(text.lower().split())

    def _compute_content_hash(self) -> str:
        """Gera SHA256 do título + comentário normalizados."""
        texto = f"{self.titulo or ''}|{self.comentario or ''}"
        texto_norm = self._normalize_text_for_hash(texto)
        return hashlib.sha256(texto_norm.encode('utf-8')).hexdigest()

    def clean(self):
        """Validação em nível de aplicação"""
        # Verifica se usuário já avaliou este produto
        if self.pk is None:  # Apenas para novas avaliações
            existing = Avaliacao.objects.filter(
                produto=self.produto,
                usuario=self.usuario
            ).exists()
            if existing:
                raise ValidationError("Você já avaliou este produto.")
        
        # Verifica duplicatas por hash (spam prevention)
        if self.hash_avaliacao:
            duplicate = Avaliacao.objects.filter(
                hash_avaliacao=self.hash_avaliacao
            ).exclude(pk=self.pk).first()
            if duplicate:
                self.status = 'spam'
                self.hash_avaliacao = None  # Remove hash para evitar constraint

    # ---- save com tratamento de concorrência / duplicatas ----
    def save(self, *args, **kwargs):
        # Se não houver hash, calcula a partir do conteúdo (title + comment)
        if not self.hash_avaliacao:
            try:
                self.hash_avaliacao = self._compute_content_hash()
            except Exception as e:
                logger.exception("Erro ao calcular hash_avaliacao: %s", e)
                self.hash_avaliacao = None

        # Validação
        try:
            self.clean()
        except ValidationError as e:
            if hasattr(self, '_state') and self._state.adding:
                # Se estiver criando nova avaliação, podemos marcar como spam
                self.status = 'spam'
                self.hash_avaliacao = None
            else:
                raise e

        # Se mudou para aprovado, marca publicado_em se ainda não setado
        if self.status == 'aprovado' and not self.publicado_em:
            self.publicado_em = timezone.now()

        # Salva com atomic para reduzir risco de race em constraints
        try:
            with transaction.atomic():
                super().save(*args, **kwargs)
        except IntegrityError as exc:
            # Captura violação de unicidade produto+usuario
            msg = str(exc)
            logger.warning("IntegrityError ao salvar Avaliacao: %s", msg)
            
            if 'unique_produto_usuario' in msg.lower() or 'duplicate' in msg.lower():
                # Usuário já avaliou este produto
                raise ValidationError("Você já avaliou este produto.")
            else:
                # Outro erro de integridade
                raise

    def delete_soft(self, motivo="Removido pelo usuário"):
        """Soft delete para conformidade com LGPD"""
        self.status = 'rejeitado'
        self.motivo_rejeicao = motivo
        self.save(update_fields=['status', 'motivo_rejeicao', 'updated_at'])

    @property
    def media_notas_especificas(self):
        notas = [self.nota_qualidade, self.nota_entrega, self.nota_custo_beneficio]
        notas_validas = [n for n in notas if n is not None]
        return (sum(notas_validas) / len(notas_validas)) if notas_validas else None

    @property
    def total_interacoes(self):
        return (self.likes or 0) + (self.dislikes or 0) + (self.util or 0) + (self.nao_util or 0)

    # ---------- helpers para estatísticas / cache ----------
    def to_stat_record(self):
        """Retorna representação curta para agregação incremental (produto+nota)"""
        return {'produto_id': self.produto_id, 'nota': int(self.nota_geral), 'publicado_em': self.publicado_em}

    @classmethod
    def recalc_cache_for_produto(cls, produto_id, cache_ttl=300):
        """
        Helper que força recalculo e atualiza cache/métodos derivados.
        Pode ser chamado por task Celery após aprovar/editar/excluir avaliações.
        """
        stats = cls.objects.stats_for_product(produto_id, cache_ttl=cache_ttl)
        cache_key = f"avaliacao_stats_prod_{produto_id}"
        cache.set(cache_key, stats, cache_ttl)
        return stats


# -----------------------
# MidiaAvaliacao
# -----------------------
class MidiaAvaliacaoManager(models.Manager):
    def aprovadas(self):
        return self.filter(aprovado=True)

    def por_tipo(self, tipo):
        return self.filter(tipo=tipo, aprovado=True)


class MidiaAvaliacao(models.Model):
    TIPO_CHOICES = [
        ('imagem', 'Imagem'),
        ('video', 'Vídeo'),
    ]

    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE, related_name='midias', db_index=True)
    arquivo = models.FileField(upload_to=upload_to_avaliacao)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    thumbnail = models.ImageField(upload_to=upload_to_avaliacao, null=True, blank=True)
    legenda = models.CharField(max_length=200, null=True, blank=True)

    # Metadados técnicos
    duracao_video = models.DurationField(null=True, blank=True)
    resolucao = models.CharField(max_length=20, null=True, blank=True)
    tamanho_bytes = models.PositiveIntegerField(null=True, blank=True)
    hash_arquivo = models.CharField(max_length=64, blank=True, null=True, editable=False, db_index=True)
    mimetype = models.CharField(max_length=100, null=True, blank=True)

    # Status e moderação
    aprovado = models.BooleanField(default=False, db_index=True)
    motivo_rejeicao = models.TextField(null=True, blank=True)
    scan_virus = models.BooleanField(default=False)
    scan_conteudo = models.BooleanField(default=False)

    # Metadados de auditoria
    created_at = models.DateTimeField(auto_now_add=True)
    processado_em = models.DateTimeField(null=True, blank=True)

    objects = MidiaAvaliacaoManager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['avaliacao', 'aprovado']),
            models.Index(fields=['hash_arquivo']),
            models.Index(fields=['tipo', 'aprovado']),
        ]

    def __str__(self):
        return f"Mídia {self.id} - {self.tipo}"

    def calcular_hash_arquivo(self):
        """Calcula hash SHA256 do conteúdo do arquivo (iterativo, suporta storages grandes)"""
        if not self.arquivo:
            return None
        try:
            hasher = hashlib.sha256()
            # .chunks() funciona tanto para storages locais quanto remotos (se suportado)
            for chunk in self.arquivo.chunks(8192):
                hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            logger.exception("Erro ao calcular hash_arquivo para MidiaAvaliacao %s: %s", self.pk, e)
            return None

    def save(self, *args, **kwargs):
        # Se houver arquivo e sem hash, tenta calcular (é I/O; se for pesado, mova para task)
        if self.arquivo and not self.hash_arquivo:
            try:
                self.hash_arquivo = self.calcular_hash_arquivo()
            except Exception:
                # fail-safe: não bloquear o save principal
                self.hash_arquivo = None

        super().save(*args, **kwargs)


# -----------------------
# Likes / Util / Denúncias
# -----------------------
class AvaliacaoLike(models.Model):
    """Registro de likes/dislikes com proteção contra falsos likes"""
    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE, related_name='user_likes', db_index=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_index=True)
    tipo = models.CharField(max_length=10, choices=[('like', 'Like'), ('dislike', 'Dislike')])

    # Proteção contra farming
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    user_agent = models.TextField(null=True, blank=True)
    session_key = models.CharField(max_length=40, null=True, blank=True, db_index=True)
    fingerprint = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    # Debounce control
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Constraint removida, substituída por validação na aplicação
        # constraints = [
        #     UniqueConstraint(fields=['avaliacao', 'usuario'], name='unique_like_por_usuario_avaliacao')
        # ]
        indexes = [
            models.Index(fields=['avaliacao', 'tipo']),
            models.Index(fields=['usuario', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['fingerprint', 'created_at']),
            # Índice para unicidade
            models.Index(fields=['avaliacao', 'usuario'], name='idx_unique_like'),
        ]

    def __str__(self):
        return f"{self.tipo} em avaliação {self.avaliacao_id}"

    def clean(self):
        """Validação em nível de aplicação"""
        existing = AvaliacaoLike.objects.filter(
            avaliacao=self.avaliacao,
            usuario=self.usuario
        ).exclude(pk=self.pk).exists()
        
        if existing:
            raise ValidationError("Você já interagiu com esta avaliação.")


class AvaliacaoUtil(models.Model):
    """Registro de votos úteis/não úteis com proteção"""
    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE, related_name='user_util', db_index=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_index=True)
    util = models.BooleanField(default=True)

    # Proteção
    ip_address = models.GenericIPAddressField(null=True, blank=True, db_index=True)
    user_agent = models.TextField(null=True, blank=True)
    session_key = models.CharField(max_length=40, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        # Constraint removida, substituída por validação na aplicação
        # constraints = [
        #     UniqueConstraint(fields=['avaliacao, 'usuario'], name='unique_util_por_usuario_avaliacao')
        # ]
        indexes = [
            models.Index(fields=['avaliacao', 'util']),
            models.Index(fields=['usuario', 'created_at']),
            # Índice para unicidade
            models.Index(fields=['avaliacao', 'usuario'], name='idx_unique_util'),
        ]

    def clean(self):
        """Validação em nível de aplicação"""
        existing = AvaliacaoUtil.objects.filter(
            avaliacao=self.avaliacao,
            usuario=self.usuario
        ).exclude(pk=self.pk).exists()
        
        if existing:
            raise ValidationError("Você já votou nesta avaliação.")


class DenunciaAvaliacao(models.Model):
    MOTIVOS_CHOICES = [
        ('spam', 'Conteúdo promocional/Spam'),
        ('inadequado', 'Conteúdo inadequado ou ofensivo'),
        ('falso', 'Informação falsa ou enganosa'),
        ('copyright', 'Violação de direitos autorais'),
        ('privacidade', 'Violação de privacidade'),
        ('outro', 'Outro motivo'),
    ]

    avaliacao = models.ForeignKey(Avaliacao, on_delete=models.CASCADE, related_name='denuncias', db_index=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_index=True)
    motivo = models.CharField(max_length=20, choices=MOTIVOS_CHOICES)
    descricao = models.TextField(null=True, blank=True)
    evidencia = models.FileField(upload_to='denuncias/', null=True, blank=True)

    # Status
    status = models.CharField(
        max_length=20,
        choices=[('pendente', 'Pendente'), ('analisado', 'Analisado'), ('descartado', 'Descartado')],
        default='pendente',
        db_index=True
    )
    moderador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                  null=True, blank=True, related_name='denuncias_analisadas')
    resolucao = models.TextField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    analisado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        # Constraint removida, substituída por validação na aplicação
        # constraints = [
        #     UniqueConstraint(fields=['avaliacao', 'usuario'], name='unique_denuncia_por_usuario_avaliacao')
        # ]
        indexes = [
            models.Index(fields=['avaliacao', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['motivo', 'status']),
            # Índice para unicidade
            models.Index(fields=['avaliacao', 'usuario'], name='idx_unique_denuncia'),
        ]

    def __str__(self):
        return f"Denúncia {self.id} - {self.motivo}"

    def clean(self):
        """Validação em nível de aplicação"""
        existing = DenunciaAvaliacao.objects.filter(
            avaliacao=self.avaliacao,
            usuario=self.usuario
        ).exclude(pk=self.pk).exists()
        
        if existing:
            raise ValidationError("Você já denunciou esta avaliação.")