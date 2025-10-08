"""
URL configuration for especialista_carros project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include  
from django.shortcuts import redirect
from core.views import admin_index

def root_redirect(request):
    """Redirecionamento condicional da raiz"""
    if request.user.is_authenticated and hasattr(request.user, 'is_admin') and request.user.is_admin:
        return redirect('admin_index')
    else:
        return redirect('index')  # Redireciona para a página inicial pública

urlpatterns = [
    # Redirecionamento da raiz
    path('', root_redirect),
    
    # Admin Django padrão (nova rota para evitar conflito)
    path('admin-django/', admin.site.urls),
    
    # URLs do app core (inclui todas as outras URLs)
    path('', include('core.urls')),
]

# Configurações de arquivos estáticos e media
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)