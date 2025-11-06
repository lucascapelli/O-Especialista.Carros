from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.db import models  # ✅ IMPORTANDO MODELS
from .models import User, Produto, Pedido, ItemPedido, StatusPedido, Pagamento, Envio

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_admin']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "As senhas não coincidem."})
        
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Este e-mail já está em uso."})
        
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        return user

class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = '__all__'

# ==================== NOVOS SERIALIZERS PARA PEDIDOS ====================

class StatusPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusPedido
        fields = ['id', 'nome', 'cor', 'ordem', 'is_final']

class ItemPedidoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_sku = serializers.CharField(source='produto.sku', read_only=True)
    subtotal = serializers.SerializerMethodField()
    
    class Meta:
        model = ItemPedido
        fields = ['id', 'produto', 'produto_nome', 'produto_sku', 'quantidade', 'preco_unitario', 'subtotal']
    
    def get_subtotal(self, obj):
        return float(obj.quantidade * obj.preco_unitario)

class PagamentoSerializer(serializers.ModelSerializer):
    metodo_nome = serializers.CharField(source='metodo.nome', read_only=True)
    metodo_tipo = serializers.CharField(source='metodo.tipo', read_only=True)
    
    class Meta:
        model = Pagamento
        fields = [
            'id', 'metodo', 'metodo_nome', 'metodo_tipo', 'valor', 'status', 
            'id_transacao', 'codigo_pagamento', 'data_expiracao', 'criado_em'
        ]

class EnvioSerializer(serializers.ModelSerializer):
    transportadora_nome = serializers.CharField(source='transportadora.nome', read_only=True)
    
    class Meta:
        model = Envio
        fields = [
            'id', 'transportadora', 'transportadora_nome', 'valor_frete', 
            'prazo_dias', 'servico', 'codigo_rastreio', 'url_rastreio', 
            'status_entrega', 'criado_em'
        ]

class PedidoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.SerializerMethodField()
    cliente_email = serializers.CharField(source='usuario.email', read_only=True)
    status_nome = serializers.CharField(source='status.nome', read_only=True)
    status_cor = serializers.CharField(source='status.cor', read_only=True)
    total_itens = serializers.SerializerMethodField()
    
    class Meta:
        model = Pedido
        fields = [
            'id', 'numero_pedido', 'cliente_nome', 'cliente_email', 
            'status', 'status_nome', 'status_cor', 'total_produtos', 
            'total_descontos', 'total_frete', 'total_final', 
            'endereco_entrega', 'canal_venda', 'criado_em', 'total_itens'
        ]
    
    def get_cliente_nome(self, obj):
        if obj.usuario.first_name:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}"
        return obj.usuario.email
    
    def get_total_itens(self, obj):
        return obj.itens.aggregate(total=models.Sum('quantidade'))['total'] or 0

class PedidoDetailSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.SerializerMethodField()
    cliente_email = serializers.CharField(source='usuario.email', read_only=True)
    cliente_telefone = serializers.SerializerMethodField()
    status = serializers.CharField(source='status.nome', read_only=True)
    status_cor = serializers.CharField(source='status.cor', read_only=True)
    itens = ItemPedidoSerializer(many=True, read_only=True)
    pagamento = serializers.SerializerMethodField()
    envio = serializers.SerializerMethodField()
    total_itens = serializers.SerializerMethodField()
    
    class Meta:
        model = Pedido
        fields = [
            'id', 'numero_pedido', 'cliente_nome', 'cliente_email', 'cliente_telefone',
            'status', 'status_cor', 'total_produtos', 'total_frete', 'total_descontos', 
            'total_final', 'endereco_entrega', 'canal_venda', 'criado_em', 
            'itens', 'pagamento', 'envio', 'total_itens'
        ]
    
    def get_cliente_nome(self, obj):
        if obj.usuario.first_name:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}"
        return obj.usuario.email
    
    def get_cliente_telefone(self, obj):
        # Se tiver telefone no usuário, adicione aqui
        return None
    
    def get_pagamento(self, obj):
        try:
            pagamento = obj.pagamento
            return PagamentoSerializer(pagamento).data
        except Pagamento.DoesNotExist:
            return None
    
    def get_envio(self, obj):
        try:
            envio = obj.envio
            return EnvioSerializer(envio).data
        except Envio.DoesNotExist:
            return None
    
    def get_total_itens(self, obj):
        return obj.itens.aggregate(total=models.Sum('quantidade'))['total'] or 0

# ==================== SERIALIZERS PARA ADMIN ====================

class PedidoAdminSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.SerializerMethodField()
    cliente_email = serializers.CharField(source='usuario.email', read_only=True)
    status_nome = serializers.CharField(source='status.nome', read_only=True)
    status_cor = serializers.CharField(source='status.cor', read_only=True)
    total_itens = serializers.SerializerMethodField()
    ultima_atualizacao = serializers.DateTimeField(source='atualizado_em', read_only=True)
    
    class Meta:
        model = Pedido
        fields = [
            'id', 'numero_pedido', 'cliente_nome', 'cliente_email',
            'status_nome', 'status_cor', 'total_final', 'criado_em',
            'ultima_atualizacao', 'total_itens'
        ]
    
    def get_cliente_nome(self, obj):
        if obj.usuario.first_name:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}"
        return obj.usuario.email
    
    def get_total_itens(self, obj):
        return obj.itens.aggregate(total=models.Sum('quantidade'))['total'] or 0

# ==================== SERIALIZERS PARA ATUALIZAÇÃO ====================

class AtualizarPerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']
    
    def validate_email(self, value):
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está em uso.")
        return value

class AtualizarStatusPedidoSerializer(serializers.Serializer):
    status = serializers.CharField(max_length=50)
    
    def validate_status(self, value):
        status_validos = ['Pendente', 'Processando', 'Enviado', 'Entregue', 'Cancelado']
        if value not in status_validos:
            raise serializers.ValidationError(f"Status inválido. Use: {', '.join(status_validos)}")
        return value

# ==================== SERIALIZERS PARA ESTATÍSTICAS ====================

class EstatisticasVendasSerializer(serializers.Serializer):
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    sales_growth = serializers.FloatField()
    orders_today = serializers.IntegerField()
    orders_today_change = serializers.CharField()
    pending_orders = serializers.IntegerField()
    pending_orders_change = serializers.IntegerField()
    average_ticket = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_ticket_growth = serializers.FloatField()