# views/produto_views.py
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from ..models import Produto
from ..serializers import ProdutoSerializer
from .permissions import IsAdminOrReadOnly
import logging
from django.db import models

logger = logging.getLogger(__name__)

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    parser_classes = [FormParser, MultiPartParser, JSONParser]
    permission_classes = [IsAdminOrReadOnly]

    def list(self, request, *args, **kwargs):
        logger.info("Listagem de produtos solicitada")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        logger.info(f"Tentativa de criar produto - Usuário: {request.user.email if request.user.is_authenticated else 'Anônimo'}")
        if not request.user.is_authenticated or not request.user.is_admin:
            return Response({'error': 'Permissão negada'}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_admin:
            return Response({'error': 'Permissão negada'}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_admin:
            return Response({'error': 'Permissão negada'}, status=403)
        logger.info(f"Produto {kwargs.get('pk')} excluído por admin: {request.user.email}")
        return super().destroy(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([AllowAny])
def produtos_destaque(request):
    produtos = Produto.objects.filter(estoque__gt=0)[:6]
    serializer = ProdutoSerializer(produtos, many=True)
    return Response({'produtos': serializer.data})

@api_view(['GET'])
@permission_classes([AllowAny])
def buscar_produtos(request):
    query = request.GET.get('q', '')
    categoria = request.GET.get('categoria', '')
    produtos = Produto.objects.all()
    if query:
        produtos = produtos.filter(models.Q(nome__icontains=query) | models.Q(descricao__icontains=query))
    if categoria:
        produtos = produtos.filter(categoria=categoria)
    serializer = ProdutoSerializer(produtos, many=True)
    return Response({
        'query': query,
        'categoria': categoria,
        'total': produtos.count(),
        'produtos': serializer.data
    })