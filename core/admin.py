# core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.core.exceptions import ImproperlyConfigured  # Adicione esta importação
from .models import User, Produto, ImagemProduto

# Importação segura dos forms
try:
    from .forms import CustomUserCreationForm, CustomUserChangeForm
    FORMS_AVAILABLE = True
except (ImportError, ImproperlyConfigured) as e:
    # Log para debug se necessário
    import logging
    logger = logging.getLogger(__name__)
    logger.debug(f"Forms não disponíveis durante importação: {e}")
    FORMS_AVAILABLE = False
    
    # Definir classes dummy para evitar erros
    class CustomUserCreationForm:
        pass
    
    class CustomUserChangeForm:
        pass

# Só registra se os forms estiverem disponíveis
if FORMS_AVAILABLE:
    class UserAdmin(BaseUserAdmin):
        add_form = CustomUserCreationForm
        form = CustomUserChangeForm
        model = User

        list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active')
        list_filter = ('is_staff', 'is_active')
        fieldsets = (
            (None, {'fields': ('email', 'password')}),
            ('Informações Pessoais', {'fields': ('first_name', 'last_name')}),
            ('Permissões', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        )
        add_fieldsets = (
            (None, {
                'classes': ('wide',),
                'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'is_staff', 'is_active')}
            ),
        )
        search_fields = ('email',)
        ordering = ('email',)

    admin.site.register(User, UserAdmin)

# ---------- CONFIGURAÇÃO PARA PRODUTO ----------
if Produto is not None:
    class ImagemProdutoInline(admin.TabularInline):
        model = ImagemProduto
        extra = 1
        fields = ['imagem', 'ordem', 'legenda', 'is_principal']
        readonly_fields = ['data_criacao']

    @admin.register(Produto)
    class ProdutoAdmin(admin.ModelAdmin):
        inlines = [ImagemProdutoInline]
        list_display = ['nome', 'categoria', 'status', 'estoque', 'preco']
        list_filter = ['categoria', 'status']
        search_fields = ['nome', 'sku', 'descricao']
        
        fieldsets = [
            ('Informações Básicas', {
                'fields': ['nome', 'sku', 'descricao', 'categoria', 'status']
            }),
            ('Preço e Estoque', {
                'fields': ['preco', 'estoque']
            }),
            ('Dimensões para Frete', {
                'fields': ['peso', 'altura', 'largura', 'comprimento']
            }),
            ('Imagem Principal (Compatibilidade)', {
                'fields': ['imagem'],
                'classes': ['collapse']
            }),
        ]

    @admin.register(ImagemProduto)
    class ImagemProdutoAdmin(admin.ModelAdmin):
        list_display = ['produto', 'ordem', 'is_principal', 'data_criacao']
        list_filter = ['produto', 'is_principal']
        search_fields = ['produto__nome', 'legenda']
        ordering = ['produto', 'ordem']
        readonly_fields = ['data_criacao']