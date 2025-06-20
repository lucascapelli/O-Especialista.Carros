from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


# Modelos existentes
class Produto(models.Model):
    nome = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, unique=True, blank=True, null=True)  # SKU único
    descricao = models.TextField(blank=True)  # Permite descrição vazia
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    imagem = models.ImageField(upload_to='produtos/', blank=True, null=True)  # Permite imagem opcional
    estoque = models.IntegerField(default=0)
    categoria = models.CharField(max_length=50, choices=[
        ('Lavagem', 'Lavagem'),
        ('Polimento', 'Polimento'),
        ('Proteção', 'Proteção'),
        ('Acessórios', 'Acessórios'),
    ], blank=True)  # Categorias predefinidas
    status = models.CharField(max_length=20, choices=[
        ('Ativo', 'Ativo'),
        ('Inativo', 'Inativo'),
        ('Últimas unidades', 'Últimas unidades'),
    ], default='Ativo')  # Status com opções
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} ({self.sku or 'Sem SKU'})"

class Servico(models.Model):
    nome = models.CharField(max_length=255)
    descricao = models.TextField()
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    imagem = models.ImageField(upload_to='servicos/')  # Para salvar imagens dos serviços
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


# Manager customizado para User
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('O email deve ser fornecido')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser precisa ter is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser precisa ter is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


# Model de Usuário Personalizado
class User(AbstractBaseUser, PermissionsMixin):  # adiciona PermissionsMixin para is_superuser, permissões
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email
