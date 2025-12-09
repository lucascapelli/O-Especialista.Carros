# views/produto_views.py
from django.shortcuts import render, get_object_or_404
from django.core.cache import cache
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from ..models import Produto, ImagemProduto, Avaliacao
from ..serializers import ProdutoSerializer, ImagemProdutoSerializer, ProdutoDetailSerializer
from .permissions import IsAdminOrReadOnly
import logging
from django.db import models

logger = logging.getLogger(__name__)

# FUNÇÃO DE DETALHES DO PRODUTO (Template Django)
def detalhes_produto(request, produto_id):
    """View para página de detalhes do produto com template Django"""
    try:
        # Obtém o produto com todas as relações necessárias
        produto = get_object_or_404(
            Produto.objects.select_related('categoria')
            .prefetch_related('imagens'),
            id=produto_id,
            status='Ativo'
        )
        
        # AVALIAÇÕES - Cache implementado
        cache_key = f'produto_{produto_id}_avaliacoes_context'
        avaliacoes_context = cache.get(cache_key)
        
        if not avaliacoes_context:
            # Avaliações principais (aprovadas)
            avaliacoes = Avaliacao.objects.filter(
                produto=produto, 
                status='aprovado'
            ).select_related('usuario').prefetch_related('midias')[:5]
            
            # Estatísticas
            estatisticas = {
                'media': produto.media_avaliacoes or 0.0,
                'total': produto.total_avaliacoes,
                'distribuicao': produto.distribuicao_avaliacoes,
                'recomendacao_percent': produto.percentual_recomendacao or 100,
                'com_midia': produto.avaliacoes_com_midia.count(),
            }
            
            # Mídias para galeria (máximo 12)
            midias_destaque = []
            for av in Avaliacao.objects.filter(
                produto=produto, 
                status='aprovado',
                midias__isnull=False
            ).prefetch_related('midias')[:6]:
                for midia in av.midias.filter(aprovado=True)[:2]:  # Máx 2 por avaliação
                    if len(midias_destaque) < 12:
                        midias_destaque.append(midia)
            
            avaliacoes_context = {
                'avaliacoes': avaliacoes,
                'estatisticas': estatisticas,
                'midias_destaque': midias_destaque,
            }
            
            # Cache por 5 minutos
            cache.set(cache_key, avaliacoes_context, 300)
        
        # Produtos relacionados
        produtos_relacionados = Produto.objects.filter(
            categoria=produto.categoria,
            status='Ativo'
        ).exclude(id=produto.id)[:4]
        
        context = {
            'produto': produto,
            'produtos_relacionados': produtos_relacionados,
            **avaliacoes_context,  # Desempacota tudo
        }
        
        return render(request, 'core/front-end/detalhes_produto.html', context)
        
    except Exception as e:
        logger.error(f"Erro na view detalhes_produto para ID {produto_id}: {str(e)}")
        return render(request, 'core/front-end/404.html', status=404)


# SUA ProdutoViewSet EXISTENTE - ATUALIZE para usar o serializer correto
class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer  # Mantenha o serializer básico para listas
    parser_classes = [FormParser, MultiPartParser, JSONParser]
    permission_classes = [IsAdminOrReadOnly]

    # ADICIONE esta action para detalhes completos com galeria
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def detalhes_com_galeria(self, request, pk=None):
        """Endpoint para página de detalhes com galeria completa"""
        try:
            produto = self.get_object()
            print(f"🔍 VIEW DEBUG: Acessando detalhes com galeria para produto {pk}")
            serializer = ProdutoDetailSerializer(produto, context={'request': request})
            print(f"🔍 VIEW DEBUG: Serializer criado para produto {pk}")
            data = serializer.data
            print(f"🔍 VIEW DEBUG: Dados serializados retornados para produto {pk}")
            return Response(data)
        except Exception as e:
            logger.error(f"Erro ao buscar detalhes do produto {pk}: {str(e)}")
            return Response({'error': 'Produto não encontrado'}, status=404)

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


# views/produto_views.py - SUBSTITUA A ImagemProdutoViewSet
class ImagemProdutoViewSet(viewsets.ModelViewSet):
    queryset = ImagemProduto.objects.all()
    serializer_class = ImagemProdutoSerializer
    parser_classes = [FormParser, MultiPartParser, JSONParser]
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        produto_id = self.request.query_params.get('produto_id')
        if produto_id:
            queryset = queryset.filter(produto_id=produto_id)
        return queryset.order_by('ordem')

    def create(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_admin:
            return Response({'error': 'Permissão negada'}, status=403)
        
        print(f"🔍 UPLOAD DEBUG: Dados recebidos - {dict(request.data)}")
        print(f"🔍 UPLOAD DEBUG: Arquivos - {[f.name for f in request.FILES.getlist('imagem')]}")
        
        # ✅ CORREÇÃO CRÍTICA: Garantir que produto_id seja convertido para inteiro
        try:
            produto_id = int(request.data.get('produto'))
            print(f"🔍 UPLOAD DEBUG: Produto ID convertido: {produto_id}")
        except (TypeError, ValueError) as e:
            print(f"❌ UPLOAD DEBUG: Erro ao converter produto_id: {e}")
            return Response({'error': 'ID do produto inválido'}, status=400)
        
        images = request.FILES.getlist('imagem')
        
        if len(images) > 1:
            # Upload múltiplo
            created_images = []
            for i, image in enumerate(images):
                try:
                    # ✅ CORREÇÃO: Criar dados corretamente
                    data = {
                        'produto': produto_id,
                        'imagem': image,
                        'ordem': i + 1,
                        'legenda': request.data.get('legenda', ''),
                        'is_principal': request.data.get('is_principal', 'false').lower() == 'true'
                    }
                    
                    print(f"🔍 UPLOAD DEBUG: Criando imagem {i+1} com dados: {data}")
                    
                    serializer = self.get_serializer(data=data)
                    if serializer.is_valid():
                        instance = serializer.save()
                        created_images.append(serializer.data)
                        print(f"✅ UPLOAD DEBUG: Imagem {i+1} salva com ID {instance.id}")
                    else:
                        print(f"❌ UPLOAD DEBUG: Erro de validação imagem {i+1}: {serializer.errors}")
                        return Response(serializer.errors, status=400)
                        
                except Exception as e:
                    print(f"❌ UPLOAD DEBUG: Erro ao processar imagem {i+1}: {e}")
                    return Response({'error': f'Erro ao processar imagem {i+1}: {str(e)}'}, status=500)
            
            print(f"✅ UPLOAD DEBUG: {len(created_images)} imagens salvas com sucesso")
            return Response(created_images, status=201)
        else:
            # Upload único
            print(f"🔍 UPLOAD DEBUG: Modo upload único")
            return super().create(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([AllowAny])
def produtos_destaque(request):
    # ✅ APENAS produtos ATIVOS em destaque
    produtos = Produto.objects.filter(status='Ativo', estoque__gt=0)[:6]
    serializer = ProdutoSerializer(produtos, many=True)  # Use o serializer básico
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
    serializer = ProdutoSerializer(produtos, many=True)  # Use o serializer básico
    return Response({
        'query': query,
        'categoria': categoria,
        'total': produtos.count(),
        'produtos': serializer.data
    })


# ADICIONE esta view para a página de detalhes do produto
@api_view(['GET'])
@permission_classes([AllowAny])
def produto_detalhes_com_galeria(request, produto_id):
    """Endpoint específico para página de detalhes com galeria completa"""
    try:
        print(f"🔍 API VIEW DEBUG: Buscando detalhes com galeria para produto {produto_id}")
        produto = Produto.objects.prefetch_related('imagens').get(
            id=produto_id, 
            status='Ativo'
        )
        print(f"🔍 API VIEW DEBUG: Produto encontrado: {produto.nome}")
        serializer = ProdutoDetailSerializer(produto, context={'request': request})
        print(f"🔍 API VIEW DEBUG: Serialização concluída para produto {produto_id}")
        return Response(serializer.data)
    except Produto.DoesNotExist:
        print(f"❌ API VIEW DEBUG: Produto {produto_id} não encontrado")
        return Response({'error': 'Produto não encontrado'}, status=404)