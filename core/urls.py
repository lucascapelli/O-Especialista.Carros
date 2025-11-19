# core/urls.py
from django.urls import path, include
from .views import (
    # Public Views (apenas renderização)
    index, login_page, esqueceu_senha_page, criar_conta_page,
    detalhes_produto, contato_envio, home, produtos_listagem,
    
    # Auth Views
    LoginView, RegisterView, logout_view, admin_login, password_reset_confirm,
    
    # Carrinho Views
    carrinho, carrinho_json, adicionar_carrinho, remover_carrinho, alterar_quantidade, simular_frete_carrinho,
    
    # Admin Views
    admin_index, delete_user, admin_pedidos, admin_produtos, atualizar_status_pedido, 
    perfil_usuario, detalhes_pedido_admin, admin_user_profile, toggle_user_status, 
    force_logout_user, send_password_reset, toggle_suspicious_user, update_user_risk_level,
    
    # Produto Views
    produtos_destaque, buscar_produtos, ProdutoViewSet,
    
    # API Views (APIs REST)
    atualizar_perfil, check_auth, CheckAuthView, api_esqueceu_senha,
    
    # Pagamento Views
    criar_pagamento_abacatepay, preparar_pagamento, criar_pedido_apos_pagamento, meus_pedidos,
    
    # Shipping Views
    simular_frete_api, rastrear_pedido_api
)
from .integrations.abacatepay_webhook import abacatepay_webhook
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    # PÁGINA INICIAL (ÚNICA)
    path('', index, name='index'),           # ← Raiz do site
    path('home/', index, name='home'),  
    path('produtos/', produtos_listagem, name='produtos_listagem'),

    # AUTENTICAÇÃO (RENDERIZAÇÃO)
    path('login/', login_page, name='login'),
    path('esqueceu-senha/', esqueceu_senha_page, name='esqueceusenha'),
    path('criar-conta/', criar_conta_page, name='criarconta'),

    # PRODUTOS
    path('produto/<int:produto_id>/', detalhes_produto, name='detalhes_produto'),

    # ========== APIs REST ==========
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
    path('api/esqueceu-senha/', api_esqueceu_senha, name='api_esqueceu_senha'),  # ✅ NOVA API
    
    # AUTENTICAÇÃO E PERFIL
    path('api/auth/check/', CheckAuthView.as_view(), name='api_auth_check'),
    path('api/check-auth/', check_auth, name='check_auth'),
    path('api/perfil/atualizar/', atualizar_perfil, name='api_perfil_atualizar'),
    
    # PRODUTOS
    path('api/produtos/destaque/', produtos_destaque, name='api_produtos_destaque'),
    path('api/produtos/buscar/', buscar_produtos, name='api_produtos_buscar'),
    
    # PAGAMENTO
    path('api/criar-pagamento-abacatepay/<int:pedido_id>/', criar_pagamento_abacatepay, name='criar_pagamento_abacatepay'),
    path('api/preparar-pagamento/', preparar_pagamento, name='preparar_pagamento'),
    path('api/criar-pedido-apos-pagamento/', criar_pedido_apos_pagamento, name='criar_pedido_apos_pagamento'),
    
    # FRETE
    path('api/frete/simular/', simular_frete_api, name='api_frete_simular'),
    path('api/rastreio/<str:codigo>/', rastrear_pedido_api, name='api_rastreio_pedido'),
    
    # ADMIN APIs
    path('api/admin/pedidos/<int:pedido_id>/detalhes/', detalhes_pedido_admin, name='admin_pedido_detalhes'),
    path('api/admin/pedidos/<int:pedido_id>/status/', atualizar_status_pedido, name='admin_pedido_status_api'),

    # ========== PÁGINAS DO USUÁRIO ==========
    path('perfil/', perfil_usuario, name='perfil'),
    path('carrinho/', carrinho, name='carrinho'),
    path('contato-envio/', contato_envio, name='contato-envio'),
    path('meus-pedidos/', meus_pedidos, name='meus_pedidos'),
    path('password-reset/<uidb64>/<token>/', password_reset_confirm, name='password_reset_confirm'), 

    # ========== CARRINHO (MISTO - APIs e páginas) ==========
    path('carrinho-json/', carrinho_json, name='carrinho_json'),
    path('adicionar_carrinho/<int:produto_id>/', adicionar_carrinho, name='adicionar_carrinho'),
    path('remover_carrinho/<int:item_id>/', remover_carrinho, name='remover_carrinho'),
    path('alterar-quantidade/<int:item_id>/', alterar_quantidade, name='alterar_quantidade'),
    path('api/carrinho/simular-frete/', simular_frete_carrinho, name='api_carrinho_simular_frete'),

    # ========== ADMIN ==========
    path('admin-login/', admin_login, name='admin_login'),
    path('admin-panel/', admin_index, name='admin_index'),
    path('admin-panel/delete-user/<int:user_id>/', delete_user, name='delete_user'),
    path('admin-panel/pedidos/', admin_pedidos, name='admin_pedidos'),
    path('admin-panel/produtos/', admin_produtos, name='admin_produtos'),
    
    # GESTÃO AVANÇADA DE USUÁRIOS
    path('admin-panel/user-profile/<int:user_id>/', admin_user_profile, name='admin_user_profile'),
    path('admin-panel/toggle-user-status/<int:user_id>/', toggle_user_status, name='toggle_user_status'),
    path('admin-panel/force-logout/<int:user_id>/', force_logout_user, name='force_logout_user'),
    path('admin-panel/send-password-reset/<int:user_id>/', send_password_reset, name='send_password_reset'),
    path('admin-panel/toggle-suspicious/<int:user_id>/', toggle_suspicious_user, name='toggle_suspicious_user'),
    path('admin-panel/update-risk-level/<int:user_id>/', update_user_risk_level, name='update_user_risk_level'),

    # ========== OUTROS ==========
    path('logout/', logout_view, name='logout'),
    path('pagamento/abacatepay/webhook/', abacatepay_webhook, name='abacatepay_webhook'),
]

# Router do DRF
urlpatterns += router.urls