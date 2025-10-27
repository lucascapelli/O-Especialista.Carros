from django.urls import path, include
from .views import (
    produtos_listagem, LoginView, RegisterView, ProdutoViewSet,
    logout_view, carrinho, contato_envio, login_page, esqueceu_senha_page,
    criar_conta_page, carrinho_json, admin_login, admin_index, delete_user
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    # URLs públicas
    path('login/', login_page, name='login'),
    path('esqueceu-senha/', esqueceu_senha_page, name='esqueceusenha'),
    path('home/', produtos_listagem, name='index'),  # ✅ Mudei para /home/ para evitar conflito
    path('criar-conta/', criar_conta_page, name='criarconta'),
    
    # APIs
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
    path('admin-panel/delete-user/<int:user_id>/', delete_user, name='delete_user'),
    
    # Admin
    path('admin-login/', admin_login, name='admin_login'),
    path('admin-panel/', admin_index, name='admin_index'),  # ✅ Painel admin
    path('logout/', logout_view, name='logout'),
    
    # Carrinho e contato
    path('carrinho/', carrinho, name='carrinho'),
    path('contato-envio/', contato_envio, name='contato-envio'),
    path('carrinho-json/', carrinho_json, name='carrinho_json'),
]

urlpatterns += router.urls