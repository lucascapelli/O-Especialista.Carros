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
        """Update com proteção de imagem"""
        if not request.user.is_authenticated or not request.user.is_admin:
            return Response({'error': 'Permissão negada'}, status=403)
        
        try:
            instance = self.get_object()
            
            # ✅ DEBUG: Log dos dados recebidos
            logger.info(f"Atualizando produto {instance.id}")
            logger.info(f"Dados recebidos: {dict(request.data)}")
            logger.info(f"Arquivos recebidos: {dict(request.FILES)}")
            
            # ✅ Se não enviou imagem nova, remove do data para não sobrescrever
            data = request.data.copy()
            if 'imagem' not in request.FILES:
                data.pop('imagem', None)
                logger.info("✅ Nenhuma imagem nova enviada - mantendo imagem atual")
            else:
                logger.info("🔄 Nova imagem enviada - atualizando...")
            
            serializer = self.get_serializer(instance, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                logger.info(f"✅ Produto {instance.id} atualizado com sucesso")
                return Response(serializer.data)
            
            logger.warning(f"❌ Erro na validação: {serializer.errors}")
            return Response(serializer.errors, status=400)
            
        except Exception as e:
            logger.error(f"❌ Erro ao atualizar produto: {str(e)}")
            return Response({'error': 'Erro interno do servidor'}, status=500)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_admin:
            return Response({'error': 'Permissão negada'}, status=403)
        logger.info(f"Produto {kwargs.get('pk')} excluído por admin: {request.user.email}")
        return super().destroy(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([AllowAny])
def produtos_destaque(request):
    # ✅ APENAS produtos ATIVOS em destaque
    produtos = Produto.objects.filter(status='Ativo', estoque__gt=0)[:6]
    serializer = ProdutoSerializer(produtos, many=True)
    return Response({'produtos': serializer.data})

@api_view(['GET'])
@permission_classes([AllowAny])
def buscar_produtos(request):
    query = request.GET.get('q', '')
    categoria = request.GET.get('categoria', '')
    # ✅ APENAS produtos ATIVOS na busca
    produtos = Produto.objects.filter(status='Ativo')
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