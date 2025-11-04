from django.urls import path, include
from .views import (
    produtos_listagem, LoginView, RegisterView, ProdutoViewSet,
    logout_view, carrinho, contato_envio, login_page, esqueceu_senha_page,
    criar_conta_page, carrinho_json, admin_login, admin_index, delete_user,
    criar_pagamento_abacatepay, criar_pedido, adicionar_carrinho, remover_carrinho,
    alterar_quantidade, check_auth, perfil_usuario, meus_pedidos
)

from .integrations.abacatepay_webhook import abacatepay_webhook
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    # URLs públicas
    path('login/', login_page, name='login'),
    path('esqueceu-senha/', esqueceu_senha_page, name='esqueceusenha'),
    path('home/', produtos_listagem, name='index'),
    path('criar-conta/', criar_conta_page, name='criarconta'),
    
    # APIs
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
    path('api/criar-pagamento-abacatepay/<int:pedido_id>/', criar_pagamento_abacatepay, name='criar_pagamento_abacatepay'),
    path('api/pedido/criar/', criar_pedido, name='criar_pedido'),

    # Perfil e pedidos
    path('perfil/', perfil_usuario, name='perfil'),
    path('meus-pedidos/', meus_pedidos, name='meus_pedidos'),

    # API de autenticação
    path('api/check-auth/', check_auth, name='check_auth'),

    # Admin
    path('admin-login/', admin_login, name='admin_login'),
    path('admin-panel/', admin_index, name='admin_index'),
    path('admin-panel/delete-user/<int:user_id>/', delete_user, name='delete_user'),
    path('logout/', logout_view, name='logout'),
    
    # Carrinho e contato
    path('carrinho/', carrinho, name='carrinho'),
    path('contato-envio/', contato_envio, name='contato-envio'),
    path('carrinho-json/', carrinho_json, name='carrinho_json'),
    path('adicionar_carrinho/<int:produto_id>/', adicionar_carrinho, name='adicionar_carrinho'),  
    path('remover_carrinho/<int:item_id>/', remover_carrinho, name='remover_carrinho'),
    path('alterar-quantidade/<int:item_id>/', alterar_quantidade, name='alterar_quantidade'),

    # Webhooks
    path('pagamento/abacatepay/webhook/', abacatepay_webhook, name='abacatepay_webhook'),
]

# Adiciona as rotas do DRF
urlpatterns += router.urls