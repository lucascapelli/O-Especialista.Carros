from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),  # Definindo a URL para a página inicial
]
