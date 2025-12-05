from django import forms
from ..models import Avaliacao, MidiaAvaliacao

class AvaliacaoForm(forms.ModelForm):
    class Meta:
        model = Avaliacao
        fields = [
            "nota_geral",
            "titulo",
            "comentario",
            "tempo_de_uso",
            "melhor_ponto",
            "pior_ponto",
            "recomendaria",
        ]

class MidiaAvaliacaoForm(forms.ModelForm):
    class Meta:
        model = MidiaAvaliacao
        fields = ["arquivo", "legenda"]
