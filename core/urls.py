from django.urls import path, include
from .views import (
    produtos_listagem, LoginView, RegisterView, ProdutoViewSet,
    logout_view, carrinho, contato_envio, login_page, esqueceu_senha_page,
    criar_conta_page, carrinho_json
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    path('login/', login_page, name='login'),
    path('esqueceu-senha/', esqueceu_senha_page, name='esqueceusenha'),
    path('', produtos_listagem, name='index'),
    path('criar-conta/', criar_conta_page, name='criarconta'),
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
    path('logout/', logout_view, name='logout'),  # ✅ Nova rota de logout
    path('carrinho/', carrinho, name='carrinho'),
    path('contato-envio/', contato_envio, name='contato-envio'),  # ✅ Nova URL para processar o form de contato
    path('carrinho-json/', carrinho_json, name='carrinho_json'),
]

urlpatterns += router.urls
