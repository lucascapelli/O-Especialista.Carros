from django.urls import path, include
from .views import produtos_listagem, LoginView, RegisterView, ProdutoViewSet, logout_view
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    path('', produtos_listagem, name='index'),
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
    path('logout/', logout_view, name='logout'),  # ✅ Nova rota de logout
]

urlpatterns += router.urls
