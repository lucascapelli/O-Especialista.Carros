from django.urls import path
from .views import home, LoginView, RegisterView

urlpatterns = [
    path('', home, name='home'),
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', RegisterView.as_view(), name='api-register'),
]