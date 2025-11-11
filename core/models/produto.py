from django.db import models

class Produto(models.Model):
    nome = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, unique=True, blank=True, null=True)
    descricao = models.TextField(blank=True)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Campos de dimensões para cálculo de frete (OBRIGATÓRIOS para Jadlog)
    peso = models.DecimalField(
        max_digits=8, 
        decimal_places=3, 
        default=0.100,
        help_text="Peso em kg (ex: 0.500 para 500g)"
    )
    altura = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        default=1.00,
        help_text="Altura em cm"
    )
    largura = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        default=1.00,
        help_text="Largura em cm"
    )
    comprimento = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        default=1.00,
        help_text="Comprimento em cm"
    )
    
    imagem = models.ImageField(upload_to='produtos/', blank=True, null=True)
    estoque = models.IntegerField(default=0)
    categoria = models.CharField(max_length=50, choices=[
        ('Lavagem', 'Lavagem'),
        ('Polimento', 'Polimento'),
        ('Proteção', 'Proteção'),
        ('Acessórios', 'Acessórios'),
    ], blank=True)
    status = models.CharField(max_length=20, choices=[
        ('Ativo', 'Ativo'),
        ('Inativo', 'Inativo'),
        ('Últimas unidades', 'Últimas unidades'),
    ], default='Ativo')
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} ({self.sku or 'Sem SKU'})"
    
    @property
    def dimensoes_formatadas(self):
        """Retorna as dimensões formatadas para exibição"""
        return f"{self.altura} x {self.largura} x {self.comprimento} cm"
    
    @property
    def peso_formatado(self):
        """Retorna o peso formatado para exibição"""
        peso_gramas = float(self.peso) * 1000
        if peso_gramas < 1000:
            return f"{peso_gramas:.0f}g"
        return f"{self.peso}kg"

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        indexes = [
            models.Index(fields=['categoria', 'status']),
            models.Index(fields=['data_criacao']),
        ]