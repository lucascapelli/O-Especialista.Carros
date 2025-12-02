from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Produto, ImagemProduto
from .forms import CustomUserCreationForm, CustomUserChangeForm

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

# ---------- CONFIGURAÇÃO ATUALIZADA PARA PRODUTO E IMAGEMPRODUTO ----------

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