# core/models/orders.py
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
        verbose_name = "Status do Pedido"
        verbose_name_plural = "Status dos Pedidos"

    def __str__(self):
        return self.nome

    @classmethod
    def criar_status_padrao(cls):
        """Cria os status padrão do sistema se não existirem"""
        status_padrao = [
            {'nome': 'Pendente', 'ordem': 1, 'cor': '#F59E0B', 'is_final': False},
            {'nome': 'Processando', 'ordem': 2, 'cor': '#F97316', 'is_final': False},
            {'nome': 'Enviado', 'ordem': 3, 'cor': '#3B82F6', 'is_final': False},
            {'nome': 'Entregue', 'ordem': 4, 'cor': '#10B981', 'is_final': True},
            {'nome': 'Cancelado', 'ordem': 5, 'cor': '#EF4444', 'is_final': True},
        ]
        
        criados = []
        for status_data in status_padrao:
            obj, created = cls.objects.get_or_create(
                nome=status_data['nome'],
                defaults=status_data
            )
            if created:
                criados.append(obj.nome)
        
        if criados:
            print(f"✅ Status criados: {', '.join(criados)}")
        return criados


class Pedido(BaseModel):
    numero_pedido = models.CharField(max_length=20, unique=True, editable=False)
    usuario = models.ForeignKey(User, on_delete=models.PROTECT, related_name='pedidos')
    status = models.ForeignKey(StatusPedido, on_delete=models.PROTECT)
    
    # CPF/CNPJ do destinatário (OBRIGATÓRIO para Jadlog)
    cpf_destinatario = models.CharField(
        max_length=14,
        blank=True,
        help_text="CPF ou CNPJ do destinatário (obrigatório para envio)"
    )
    
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
        verbose_name = "Pedido"
        verbose_name_plural = "Pedidos"

    def save(self, *args, **kwargs):
        if not self.numero_pedido:
            timestamp = timezone.now().strftime('%y%m%d%H%M%S')
            self.numero_pedido = f"ORD{timestamp}"
        
        # Garantir que existe pelo menos o status Pendente
        if not self.status_id:
            StatusPedido.criar_status_padrao()
            status_padrao = StatusPedido.objects.get(nome='Pendente')
            self.status = status_padrao
        
        # Primeiro salva para ter um ID
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Se for um novo pedido, calcula os totais
        if is_new:
            self.calcular_totais()
            # Salva novamente com os totais calculados
            super().save(update_fields=['total_produtos', 'total_descontos', 'total_frete', 'total_final'])

    def calcular_totais(self):
        """Calcula totais do pedido de forma segura"""
        try:
            # Verifica se o pedido tem ID e itens
            if self.pk and hasattr(self, 'itens'):
                self.total_produtos = sum(item.subtotal for item in self.itens.all())
                self.total_final = self.total_produtos - self.total_descontos + self.total_frete
            else:
                # Se não tem itens ainda, define valores padrão
                self.total_produtos = 0
                self.total_final = 0
        except Exception as e:
            # Em caso de erro, define valores seguros
            self.total_produtos = 0
            self.total_final = 0
            print(f"Erro ao calcular totais do pedido: {e}")

    @property
    def endereco_completo(self):
        """Retorna o endereço formatado para exibição"""
        if not self.endereco_entrega:
            return "Endereço não informado"
        
        end = self.endereco_entrega
        return f"{end.get('logradouro', '')}, {end.get('numero', '')} - {end.get('bairro', '')}, {end.get('cidade', '')} - {end.get('estado', '')}"

    def validar_para_envio(self):
        """
        Valida se o pedido tem todos os dados necessários para envio
        Returns: (bool, str) - (válido, mensagem_erro)
        """
        # Verificar CPF/CNPJ do destinatário
        if not self.cpf_destinatario:
            return False, "CPF/CNPJ do destinatário não informado"
        
        # Verificar endereço completo
        if not self.endereco_entrega:
            return False, "Endereço de entrega não informado"
        
        campos_obrigatorios = ['logradouro', 'numero', 'bairro', 'cidade', 'estado', 'cep']
        for campo in campos_obrigatorios:
            if not self.endereco_entrega.get(campo):
                return False, f"Campo {campo} do endereço não informado"
        
        # Verificar se tem itens com dimensões
        if not self.itens.exists():
            return False, "Pedido não possui itens"
        
        for item in self.itens.all():
            if not item.produto.peso or float(item.produto.peso) <= 0:
                return False, f"Produto {item.produto.nome} não possui peso definido"
        
        return True, "Pedido válido para envio"


class ItemPedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.PositiveIntegerField()
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "Item do Pedido"
        verbose_name_plural = "Itens do Pedido"

    @property
    def subtotal(self):
        return self.quantidade * self.preco_unitario

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome} - R$ {self.subtotal}"
    
    @property
    def peso_total(self):
        """Retorna o peso total do item (quantidade * peso unitário)"""
        return float(self.produto.peso) * self.quantidade