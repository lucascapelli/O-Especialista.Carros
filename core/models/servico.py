from django.db import models

class Servico(models.Model):
    nome = models.CharField(max_length=255)
    descricao = models.TextField()
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    imagem = models.ImageField(upload_to='servicos/')
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome
