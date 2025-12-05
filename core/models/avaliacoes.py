import uuid
import os
import hashlib
from django.db import models, transaction
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def upload_to_avaliacao(instance, filename):
    """Estrutura otimizada para armazenamento S3/CDN"""
    ext = filename.split('.')[-1].lower()
    filename = f"{uuid.uuid4().hex[:12]}.{ext}"
    return f'avaliacoes/prod_{instance.avaliacao.produto_id}/{timezone.now().strftime("%Y/%m")}/{filename}'

class AvaliacaoManager(models.Manager):
    def aprovadas(self):
        """Retorna apenas avaliações aprovadas"""
        return self.filter(status='aprovado')
    
    def com_midia(self):
        """Avaliações que possuem mídias"""
        return self.filter(midias__isnull=False).distinct()
    
    def por_produto_usuario(self, produto_id, usuario_id):
        """Verifica se usuário já avaliou o produto"""
        return self.filter(produto_id=produto_id, usuario_id=usuario_id).first()

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
    produto = models.ForeignKey('Produto', on_delete=models.CASCADE, related_name='avaliacoes', db_index=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='avaliacoes', db_index=True)
    
    # Notas
    nota_geral = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Nota de 1 a 5 estrelas"
    )
    
    # Notas específicas (opcional)
    nota_qualidade = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    nota_entrega = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    nota_custo_beneficio = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    
    # Conteúdo
    titulo = models.CharField(max_length=200, help_text="Título da sua avaliação")
    comentario = models.TextField(help_text="Conte sua experiência detalhada")
    
    # Informações úteis
    tempo_de_uso = models.CharField(max_length=50, null=True, blank=True)
    melhor_ponto = models.CharField(max_length=200, null=True, blank=True)
    pior_ponto = models.CharField(max_length=200, null=True, blank=True)
    recomendaria = models.BooleanField(default=True)
    
    # Status e moderação
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    moderador = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='avaliacoes_moderadas'
    )
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
    hash_avaliacao = models.CharField(max_length=64, blank=True, editable=False, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    publicado_em = models.DateTimeField(null=True, blank=True, db_index=True)
    
    objects = AvaliacaoManager()
    
    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['produto', 'usuario'],
                name='unique_avaliacao_produto_usuario'
            ),
            models.UniqueConstraint(
                fields=['hash_avaliacao'],
                condition=models.Q(hash_avaliacao__isnull=False),
                name='unique_hash_avaliacao'
            )
        ]
        indexes = [
            models.Index(fields=['produto', 'status', 'created_at']),
            models.Index(fields=['produto', 'nota_geral']),
            models.Index(fields=['status', 'publicado_em']),
            models.Index(fields=['usuario', 'created_at']),
        ]
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
    
    def __str__(self):
        return f"Avaliação de {self.usuario} para {self.produto.nome}"
    
    def save(self, *args, **kwargs):
        # Gera hash para detecção de duplicatas
        if not self.hash_avaliacao:
            hash_input = f"{self.produto_id}_{self.usuario_id}_{self.nota_geral}_{self.comentario[:100]}"
            self.hash_avaliacao = hashlib.sha256(hash_input.encode()).hexdigest()
        
        # Se for aprovado pela primeira vez, marca a data de publicação
        if self.status == 'aprovado' and not self.publicado_em:
            self.publicado_em = timezone.now()
        
        super().save(*args, **kwargs)
    
    def delete_soft(self, motivo="Removido pelo usuário"):
        """Soft delete para conformidade com LGPD"""
        self.status = 'rejeitado'
        self.motivo_rejeicao = motivo
        self.save()
    
    @property
    def media_notas_especificas(self):
        notas = [self.nota_qualidade, self.nota_entrega, self.nota_custo_beneficio]
        notas_validas = [n for n in notas if n is not None]
        return sum(notas_validas) / len(notas_validas) if notas_validas else None
    
    @property
    def total_interacoes(self):
        return self.likes + self.dislikes + self.util + self.nao_util

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
    hash_arquivo = models.CharField(max_length=64, blank=True, editable=False, db_index=True)
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
        """Calcula hash MD5 do conteúdo do arquivo"""
        if self.arquivo:
            hash_md5 = hashlib.md5()
            for chunk in self.arquivo.chunks(8192):
                hash_md5.update(chunk)
            return hash_md5.hexdigest()
        return None
    
    def save(self, *args, **kwargs):
        # Calcula hash do arquivo para detecção de duplicatas
        if self.arquivo and not self.hash_arquivo:
            self.hash_arquivo = self.calcular_hash_arquivo()
        
        super().save(*args, **kwargs)

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
        unique_together = ['avaliacao', 'usuario']
        indexes = [
            models.Index(fields=['avaliacao', 'tipo']),
            models.Index(fields=['usuario', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['fingerprint', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.tipo} em avaliação {self.avaliacao_id}"

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
        unique_together = ['avaliacao', 'usuario']
        indexes = [
            models.Index(fields=['avaliacao', 'util']),
            models.Index(fields=['usuario', 'created_at']),
        ]

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
    moderador = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='denuncias_analisadas'
    )
    resolucao = models.TextField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    analisado_em = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['avaliacao', 'usuario']
        indexes = [
            models.Index(fields=['avaliacao', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['motivo', 'status']),
        ]
    
    def __str__(self):
        return f"Denúncia {self.id} - {self.motivo}"