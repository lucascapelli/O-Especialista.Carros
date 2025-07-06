from django.urls import path, include
from .views import produtos_listagem, LoginView, RegisterView, ProdutoViewSet, logout_view, carrinho, contato_envio, login_page
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    path('login/', login_page, name='login'),
    path('', produtos_listagem, name='index'),
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
    path('logout/', logout_view, name='logout'),  # ✅ Nova rota de logout
    path('carrinho/', carrinho, name='carrinho'),
    path('contato-envio/', contato_envio, name='contato-envio'),  # ✅ Nova URL para processar o form de contato
]

urlpatterns += router.urls
