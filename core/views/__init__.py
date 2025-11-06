# views/__init__.py
from .public_views import (
    index, login_page, esqueceu_senha_page, criar_conta_page,
    produtos_listagem, detalhes_produto, contato_envio, home
)
from .auth_views import (
    LoginView, RegisterView, admin_login, logout_view
)
from .carrinho_views import (
    carrinho, carrinho_json, adicionar_carrinho,
    remover_carrinho, alterar_quantidade, get_or_create_carrinho
)
from .pagamento_views import criar_pagamento_abacatepay
from .pedido_views import (
    criar_pedido, meus_pedidos_api, detalhes_pedido_api,
    meus_pedidos, checkout
)
from .produto_views import (
    ProdutoViewSet, produtos_destaque, buscar_produtos
)
from .admin_views import (
    admin_index, delete_user, admin_pedidos, admin_produtos,
    atualizar_status_pedido, perfil_usuario
)
from .api_views import (
    check_auth, CheckAuthView, atualizar_perfil
)
from .permissions import IsAdminOrReadOnly, IsAdminUser