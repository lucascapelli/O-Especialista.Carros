"""
URL configuration for especialista_carros project.

O `urlpatterns` roteia URLs para views.
Mais informações: https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""

from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from core.views import index as public_index  # importa a view que carrega os produtos

def root_redirect(request):
    """
    Redireciona a raiz do site dependendo do tipo de usuário:
    - Admin autenticado → painel admin customizado
    - Visitante / usuário comum → página inicial pública
    """
    if request.user.is_authenticated and getattr(request.user, 'is_admin', False):
        return redirect('admin_index')
    # Usa a mesma view pública da home (carrega os produtos)
    return public_index(request)


urlpatterns = [
    # Admin Django padrão (mantido pra evitar conflito com o painel custom)
    path('admin-django/', admin.site.urls),

    # Redirecionamento condicional da raiz
    path('', root_redirect, name='root_redirect'),

    # Inclui todas as URLs do app core
    path('', include('core.urls')),
]

# Configurações de arquivos estáticos e media
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
