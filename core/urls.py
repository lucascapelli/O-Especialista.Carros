from django.urls import path
from .views import home, LoginView

urlpatterns = [
    path('', home, name='home'),
    path('api/login/', LoginView.as_view(), name='api-login'),
]
