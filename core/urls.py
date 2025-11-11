# core/urls.py
from django.urls import path, include
from .views import (
    index, login_page, esqueceu_senha_page, criar_conta_page,
    detalhes_produto, contato_envio, LoginView, RegisterView, logout_view,
    carrinho, carrinho_json, adicionar_carrinho, remover_carrinho, alterar_quantidade,
    admin_login, admin_index, delete_user, admin_pedidos, admin_produtos,
    atualizar_status_pedido, perfil_usuario,
    criar_pedido, produtos_destaque,
    buscar_produtos, atualizar_perfil, check_auth, CheckAuthView,
    ProdutoViewSet, criar_pagamento_abacatepay, detalhes_pedido_admin, atualizar_status_pedido
)
from .integrations.abacatepay_webhook import abacatepay_webhook
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    # PÁGINA INICIAL (ÚNICA)
    path('', index, name='index'),           # ← Raiz do site
    path('home/', index, name='home'),  

    # AUTENTICAÇÃO
    path('login/', login_page, name='login'),
    path('esqueceu-senha/', esqueceu_senha_page, name='esqueceusenha'),
    path('criar-conta/', criar_conta_page, name='criarconta'),

    # PRODUTOS
    path('produto/<int:produto_id>/', detalhes_produto, name='detalhes_produto'),

    # APIs
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
    path('api/criar-pagamento-abacatepay/<int:pedido_id>/', criar_pagamento_abacatepay, name='criar_pagamento_abacatepay'),
    path('api/pedido/criar/', criar_pedido, name='criar_pedido'),
    path('api/pedidos/<int:pedido_id>/status/', atualizar_status_pedido, name='api_pedido_status'),
    path('api/produtos/destaque/', produtos_destaque, name='api_produtos_destaque'),
    path('api/produtos/buscar/', buscar_produtos, name='api_produtos_buscar'),
    path('api/perfil/atualizar/', atualizar_perfil, name='api_perfil_atualizar'),
    path('api/auth/check/', CheckAuthView.as_view(), name='api_auth_check'),
    path('api/check-auth/', check_auth, name='check_auth'),

    # FRETE E ENVIO
    path('api/frete/simular/', criar_pedido, name='api_frete_simular'),

    # PÁGINAS DO USUÁRIO
    path('perfil/', perfil_usuario, name='perfil'),
    path('carrinho/', carrinho, name='carrinho'),
    path('contato-envio/', contato_envio, name='contato-envio'),
    path('carrinho-json/', carrinho_json, name='carrinho_json'),
    path('adicionar_carrinho/<int:produto_id>/', adicionar_carrinho, name='adicionar_carrinho'),
    path('remover_carrinho/<int:item_id>/', remover_carrinho, name='remover_carrinho'),
    path('alterar-quantidade/<int:item_id>/', alterar_quantidade, name='alterar_quantidade'),

    # ADMIN
    path('admin-login/', admin_login, name='admin_login'),
    path('admin-panel/', admin_index, name='admin_index'),
    path('admin-panel/delete-user/<int:user_id>/', delete_user, name='delete_user'),
    path('admin-panel/pedidos/', admin_pedidos, name='admin_pedidos'),
    path('admin-panel/produtos/', admin_produtos, name='admin_produtos'),
    path('api/admin/pedidos/<int:pedido_id>/detalhes/', detalhes_pedido_admin, name='admin_pedido_detalhes'),
    path('api/admin/pedidos/<int:pedido_id>/status/', atualizar_status_pedido, name='admin_pedido_status_api'),


    # LOGOUT
    path('logout/', logout_view, name='logout'),

    # WEBHOOK
    path('pagamento/abacatepay/webhook/', abacatepay_webhook, name='abacatepay_webhook'),
]

# Router do DRF
urlpatterns += router.urls