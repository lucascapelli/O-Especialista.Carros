# core/tasks/__init__.py
from .avaliacao_tasks import (
    processar_moderacao_avaliacao,
    processar_midia_avaliacao,
    limpar_avaliacoes_temporarias
)

# Exportação explícita para melhor discoverability
__all__ = [
    'processar_moderacao_avaliacao',
    'processar_midia_avaliacao',
    'limpar_avaliacoes_temporarias',
]