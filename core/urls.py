from django.urls import path
from .views import home, LoginView, RegisterView, ProdutoViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'produtos', ProdutoViewSet, basename='produto')

urlpatterns = [
    path('', home, name='home'),
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
]

urlpatterns += router.urls
