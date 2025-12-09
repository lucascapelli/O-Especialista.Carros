# core/apps.py (versão simplificada)
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    
    def ready(self):
        # Importar e registrar os signals
        import core.signals