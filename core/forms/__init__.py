# core/forms/__init__.py

# Importações de usuário
from .user_forms import CustomUserCreationForm, CustomUserChangeForm

# Importações de avaliação
from .avaliacao_forms import AvaliacaoForm, MidiaAvaliacaoForm

__all__ = [
    'CustomUserCreationForm',
    'CustomUserChangeForm',
    'AvaliacaoForm',
    'MidiaAvaliacaoForm',
]