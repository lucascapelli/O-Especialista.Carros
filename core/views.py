from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.contrib.auth import authenticate, logout, login
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.contrib import messages
from django.contrib.auth import login as auth_login
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.db import models
from django.core.paginator import Paginator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, BasePermission, SAFE_METHODS, IsAuthenticated  # ✅ ADICIONEI IsAuthenticated AQUI
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.decorators import action, api_view, permission_classes

from .serializers import UserSerializer, RegisterSerializer, ProdutoSerializer
from .models import User, Produto, Carrinho, ItemCarrinho
from core.services.payment_service import gerar_pagamento
from core.models.payments import MetodoPagamento
from core.models.orders import Pedido

import uuid
import logging

logger = logging.getLogger(__name__)


# ==================== PERMISSIONS CUSTOMIZADAS ====================
class IsAdminOrReadOnly(BasePermission):
    """
    Permissão personalizada:
    - Métodos seguros (GET, HEAD, OPTIONS) são permitidos para todos
    - Métodos de escrita (POST, PUT, DELETE) só para admins
    """
    def has_permission(self, request, view):
        # Leitura é liberada para todos
        if request.method in SAFE_METHODS:
            return True
        # Escrita só se for admin autenticado
        return request.user.is_authenticated and request.user.is_admin


class IsAdminUser(BasePermission):
    """
    Permissão que permite acesso apenas a usuários admin
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


# ==================== VIEWS PÚBLICAS ====================
def home(request):
    return HttpResponse("Bem-vindo ao especialista de carros!")


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        logger.info(f"Tentativa de login: {request.data.get('email')}")
        email = request.data.get('email')
        password = request.data.get('senha')  # Mantendo 'senha' como no frontend

        # Validação básica dos campos
        if not email or not password:
            return Response(
                {'error': 'Email e senha são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)
        if user is not None:
            login(request, user)
            serializer = UserSerializer(user)
            
            logger.info(f"Login bem-sucedido: {email} - Admin: {user.is_admin}")
            
            return Response(
                {
                    'message': 'Login realizado com sucesso',
                    'user': serializer.data,
                    'is_admin': user.is_admin,  # Informação importante para o frontend
                    'redirect_to': '/' 
                },
                status=status.HTTP_200_OK
            )
        
        logger.warning(f"Tentativa de login falhou: {email}")
        return Response(
            {'error': 'Email ou senha incorretos'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Garante que usuários registrados pelo público não sejam admins
        data = request.data.copy()
        data['is_admin'] = False  # Força is_admin=False para registros públicos
        
        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            
            logger.info(f"Novo usuário registrado: {user.email}")
            
            return Response({
                "message": "Usuário criado com sucesso",
                "redirect_to": "/login/"
            }, status=status.HTTP_201_CREATED)
        
        # Formata erros de validação
        errors = {field: ' '.join([str(e) for e in error_list]) 
          for field, error_list in serializer.errors.items()}
        
        return Response({
            "error": "Dados inválidos",
            "details": errors
        }, status=status.HTTP_400_BAD_REQUEST)


# ==================== PAGAMENTOS API ====================
@api_view(['POST'])
@permission_classes([IsAuthenticated])  # ✅ AGORA IsAuthenticated ESTÁ IMPORTADO
def criar_pagamento_abacatepay(request, pedido_id):
    """
    Cria pagamento via AbacatePay para um pedido específico
    """
    logger.info(f"Tentativa de criar pagamento - Pedido: {pedido_id}, Usuário: {request.user.email}")
    
    try:
        # Verifica se o pedido existe e pertence ao usuário (ou admin)
        if request.user.is_admin:
            pedido = Pedido.objects.get(id=pedido_id)
        else:
            pedido = Pedido.objects.get(id=pedido_id, usuario=request.user)
        
        # Obtém método de pagamento PIX
        metodo_pagamento = MetodoPagamento.objects.get(tipo="pix")
        
        # Gera o pagamento (agora retorna consistentemente UM objeto)
        pagamento = gerar_pagamento(pedido, metodo_pagamento)
        
        if pagamento.status == "erro":
            logger.error(f"Falha ao gerar pagamento - Pedido: {pedido_id}, Status: {pagamento.status}")
            return Response({
                "error": "Falha ao criar pagamento",
                "status": pagamento.status
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Pagamento criado com sucesso - Pedido: {pedido_id}, Código: {pagamento.codigo_pagamento}")
        return Response({
            "status": pagamento.status,
            "codigo_pagamento": pagamento.codigo_pagamento,
            "id_transacao": pagamento.id_transacao,
            "message": "Pagamento PIX criado com sucesso"
        })
        
    except Pedido.DoesNotExist:
        logger.warning(f"Pedido não encontrado: {pedido_id} - Usuário: {request.user.email}")
        return Response(
            {"error": "Pedido não encontrado"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except MetodoPagamento.DoesNotExist:
        logger.error("Método de pagamento PIX não configurado")
        return Response(
            {"error": "Método de pagamento não disponível"}, 
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.error(f"Erro inesperado em criar_pagamento_abacatepay: {str(e)}")
        return Response(
            {"error": "Erro interno do servidor"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== PRODUTO VIEWSET COM PERMISSÕES ====================
class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    parser_classes = [FormParser, MultiPartParser, JSONParser]
    permission_classes = [IsAdminOrReadOnly]  # Aplica a permissão personalizada

    def list(self, request, *args, **kwargs):
        """Lista produtos - permitido para todos"""
        logger.info("Listagem de produtos solicitada")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Cria produto - só admin"""
        logger.info(f"Tentativa de criar produto - Usuário: {request.user.email if request.user.is_authenticated else 'Anônimo'}")
        
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Autenticação necessária'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not request.user.is_admin:
            logger.warning(f"Usuário não-admin tentou criar produto: {request.user.email}")
            return Response(
                {'error': 'Permissão negada. Apenas administradores podem criar produtos.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Atualiza produto - só admin"""
        if not request.user.is_authenticated or not request.user.is_admin:
            return Response(
                {'error': 'Permissão negada. Apenas administradores podem editar produtos.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Exclui produto - só admin"""
        if not request.user.is_authenticated or not request.user.is_admin:
            return Response(
                {'error': 'Permissão negada. Apenas administradores podem excluir produtos.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        logger.info(f"Produto {kwargs.get('pk')} excluído por admin: {request.user.email}")
        return super().destroy(request, *args, **kwargs)


# ==================== VIEWS DE PÁGINAS ====================
def produtos_listagem(request):
    """View pública para listagem de produtos"""
    produtos = Produto.objects.all()
    return render(request, 'core/front-end/index.html', {'produtos': produtos})


@csrf_protect
def admin_index(request):
    """Área administrativa - verifica se usuário é admin"""
    if not request.user.is_authenticated or not request.user.is_admin:
        logger.warning(f"Acesso negado à admin_index - Usuário: {request.user if request.user.is_authenticated else 'Anônimo'}")
        return redirect('admin_login')
    
    site_language = request.GET.get('site_language', 'pt-BR')
    allowed_status = ['Todos', 'Pendente', 'Processando', 'Enviado', 'Entregue', 'Cancelado']
    status_filter = request.GET.get('status', 'Todos')
    
    if status_filter not in allowed_status:
        status_filter = 'Todos'

    # ---------------------------------------------------------------
    # 🔽 BLOCO DE CONFIGURAÇÕES E FILTROS
    # ---------------------------------------------------------------
    # Paginação para usuários
    users_list = User.objects.all().order_by('-id')
    
    # Filtro de busca para usuários
    search_query = request.GET.get('search', '')
    if search_query:
        users_list = users_list.filter(
            models.Q(first_name__icontains=search_query) |
            models.Q(last_name__icontains=search_query) |
            models.Q(email__icontains=search_query)
        )
    
    paginator = Paginator(users_list, 10)
    page_number = request.GET.get('page', 1)
    users_page = paginator.get_page(page_number)

    context = {
        'status': status_filter,
        'site_language': site_language,
        'is_admin': True,
        'current_section': request.GET.get('section', 'dashboard')  # Para controle no template
    }

    # ---------------------------------------------------------------
    # 🔽 BLOCO DE DADOS DO DASHBOARD (MOCKS/CONSULTAS)
    # ---------------------------------------------------------------
    if request.user.is_authenticated and request.user.is_admin:
        context.update({
            'dashboard_stats': {
                'total_sales': 15250.00,
                'sales_growth': 12.5,
                'total_products': 45,
                'new_products': 3,
                'total_customers': 128,
                'new_customers': 8,
                'pending_orders': 5,
                'pending_orders_change': -2,
            },
            'recent_orders': [
                {
                    'id': 1,
                    'order_number': 'ORD-001',
                    'customer_name': 'João Silva',
                    'order_date': '2024-01-15',
                    'order_value': 250.00,
                    'status': 'Entregue'
                },
            ],
            'recent_products': Produto.objects.all()[:5],
            'products': Produto.objects.all(),
            'users': users_page,
            'user_roles': ['Admin', 'Usuário']
        })

    logger.info(f"Admin acessou painel: {request.user.email}")
    return render(request, 'core/admin-front-end/admin_index.html', context)


# ==================== EXCLUSÃO DE USUÁRIOS ====================
@require_http_methods(["DELETE"])
@csrf_protect
def delete_user(request, user_id):
    """View para excluir usuário via AJAX"""
    if not request.user.is_authenticated or not request.user.is_admin:
        return JsonResponse({
            'success': False, 
            'error': 'Permissão negada. Apenas administradores podem excluir usuários.'
        }, status=403)
    
    try:
        user_to_delete = get_object_or_404(User, id=user_id)
        
        # Impedir que o usuário exclua a si mesmo
        if user_to_delete.id == request.user.id:
            return JsonResponse({
                'success': False,
                'error': 'Você não pode excluir sua própria conta.'
            }, status=400)
        
        # Log antes de excluir
        logger.info(f"Usuário {user_to_delete.email} (ID: {user_id}) excluído por admin: {request.user.email}")
        
        # Excluir o usuário
        user_to_delete.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Usuário excluído com sucesso!'
        })
        
    except Exception as e:
        logger.error(f"Erro ao excluir usuário {user_id}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Erro ao excluir usuário: {str(e)}'
        }, status=500)

# ==================== ADMIN LOGIN ====================
@csrf_protect
def admin_login(request):
    """View específica para login administrativo"""
    if request.user.is_authenticated and request.user.is_admin:
        return redirect('admin_index')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        remember_me = request.POST.get('remember_me')  # Checkbox no formulário
        
        # Autentica o usuário
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_admin:  # Verifica se é admin
                auth_login(request, user)
                
                # 🔒 Sessão expira ao fechar o navegador se "Lembrar-me" não estiver marcado
                if not remember_me:
                    request.session.set_expiry(0)  # Expira ao fechar o navegador
                else:
                    request.session.set_expiry(1209600)  # 2 semanas
                
                logger.info(f"Admin logado com sucesso: {user.email}")
                return redirect('admin_index')
            else:
                messages.error(request, 'Acesso permitido apenas para administradores.')
        else:
            messages.error(request, 'Usuário ou senha incorretos.')
    
    return render(request, 'core/admin-front-end/admin-login.html')

# ====================  ====================


def logout_view(request):
    """Logout com logging"""
    user_email = request.user.email if request.user.is_authenticated else 'Anônimo'
    logger.info(f"Logout realizado: {user_email}")
    
    logout(request)
    if request.path.startswith('/admin-panel/'):
        return redirect('admin_login')  # se veio do admin, volta pro login
    return redirect('index')  # senão, vai pra home



# ==================== CARRINHO (PÚBLICO) ====================
def get_or_create_carrinho(request):
    """Obtém ou cria carrinho para usuário logado ou sessão"""
    if request.user.is_authenticated:
        carrinho, created = Carrinho.objects.get_or_create(usuario=request.user)
    else:
        # Para usuários não logados, usa sessão
        session_key = request.session.get('carrinho_sessao')
        if not session_key:
            session_key = str(uuid.uuid4())
            request.session['carrinho_sessao'] = session_key
        
        carrinho, created = Carrinho.objects.get_or_create(
            sessao=session_key, 
            usuario=None
        )
    
    return carrinho


def carrinho(request):
    """Página do carrinho - acesso público"""
    carrinho_obj = get_or_create_carrinho(request)
    return render(request, 'core/front-end/carrinho.html', {'carrinho': carrinho_obj})


@require_http_methods(["POST"])
@csrf_protect
@require_http_methods(["POST"])
@csrf_protect
def adicionar_carrinho(request, produto_id):
    """Adiciona item ao carrinho - acesso público"""
    try:
        produto = get_object_or_404(Produto, id=produto_id)
        
        # Verificar estoque
        if produto.estoque <= 0:
            return JsonResponse({
                'success': False, 
                'error': 'Produto fora de estoque'
            }, status=400)
        
        carrinho_obj = get_or_create_carrinho(request)
        
        # Verifica se o item já existe
        item, created = ItemCarrinho.objects.get_or_create(
            carrinho=carrinho_obj,
            produto=produto,
            defaults={'preco_unitario': produto.preco}
        )
        
        if not created:
            # Verifica se há estoque suficiente
            if item.quantidade >= produto.estoque:
                return JsonResponse({
                    'success': False,
                    'error': 'Estoque insuficiente'
                }, status=400)
            item.quantidade += 1
            item.save()
        
        # Recarrega o carrinho para ter dados atualizados
        carrinho_obj.refresh_from_db()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'total_itens': carrinho_obj.total_itens,
                'message': 'Produto adicionado ao carrinho!'
            })
        
        return redirect('carrinho')
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_http_methods(["POST"])
@csrf_protect
def remover_carrinho(request, item_id):
    """Remove item do carrinho - acesso público"""
    item = get_object_or_404(ItemCarrinho, id=item_id)
    
    # Verifica se o item pertence ao carrinho do usuário/sessão
    carrinho_obj = get_or_create_carrinho(request)
    if item.carrinho != carrinho_obj:
        return JsonResponse({'success': False, 'error': 'Item não encontrado'})
    
    item.delete()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'total_itens': carrinho_obj.total_itens,
            'message': 'Produto removido do carrinho!'
        })
    
    return redirect('carrinho')


def carrinho_json(request):
    """API do carrinho - acesso público"""
    carrinho_obj = get_or_create_carrinho(request)
    frete = 0  # fixo por enquanto

    return JsonResponse({
        'subtotal': float(carrinho_obj.total_preco),
        'frete': frete,
        'total': float(carrinho_obj.total_preco) + frete,
        'total_itens': carrinho_obj.total_itens
    })


# ==================== PEDIDOS ====================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_pedido(request):
    """
    Cria um pedido a partir do carrinho do usuário autenticado
    e gera o pagamento via AbacatePay.
    """
    logger.info(f"Usuário {request.user.email} solicitou criação de pedido.")

    try:
        usuario = request.user
        endereco_entrega = request.data.get('endereco_entrega')
        metodo_pagamento_tipo = request.data.get('metodo_pagamento', 'pix')

        # 1️⃣ Validação básica
        if not endereco_entrega:
            return Response({'error': 'Endereço de entrega é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2️⃣ Obtém carrinho do usuário
        carrinho = Carrinho.objects.filter(usuario=usuario).first()
        if not carrinho or not carrinho.itens.exists():
            return Response({'error': 'Carrinho vazio.'}, status=status.HTTP_400_BAD_REQUEST)

        # 3️⃣ Obtém ou cria o status "Pendente"
        from core.models.orders import StatusPedido, ItemPedido
        status_pedido = StatusPedido.objects.first() or StatusPedido.objects.create(nome="Pendente")

        # 4️⃣ Cria o pedido
        pedido = Pedido.objects.create(
            usuario=usuario,
            status=status_pedido,
            endereco_entrega=endereco_entrega
        )

        # 5️⃣ Transfere os itens do carrinho para o pedido
        for item in carrinho.itens.all():
            ItemPedido.objects.create(
                pedido=pedido,
                produto=item.produto,
                quantidade=item.quantidade,
                preco_unitario=item.produto.preco
            )

        pedido.calcular_totais()
        pedido.save()

        # 6️⃣ Limpa o carrinho
        carrinho.itens.all().delete()

        # 7️⃣ Gera o pagamento
        try:
            metodo_pagamento = MetodoPagamento.objects.get(tipo=metodo_pagamento_tipo)
            pagamento = gerar_pagamento(pedido, metodo_pagamento)
        except MetodoPagamento.DoesNotExist:
            logger.warning("Método de pagamento não configurado. Pulando geração automática.")
            pagamento = None

        logger.info(f"Pedido #{pedido.id} criado com sucesso para {usuario.email}")

        response_data = {
            'message': 'Pedido criado com sucesso',
            'pedido_id': pedido.id,
            'numero_pedido': pedido.numero_pedido,
            'total_final': float(pedido.total_final),
            'status': pedido.status.nome,
        }

        if pagamento:
            response_data['pagamento'] = {
                'codigo_pagamento': pagamento.codigo_pagamento,
                'status': pagamento.status,
                'id_transacao': pagamento.id_transacao
            }

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Erro ao criar pedido: {str(e)}", exc_info=True)
        return Response({'error': f'Erro interno: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== CONTATO E PÁGINAS PÚBLICAS ====================
@require_http_methods(["POST"])
@csrf_protect
def contato_envio(request):
    """Processa formulário de contato - acesso público"""
    nome = request.POST.get('name')
    email = request.POST.get('email')
    telefone = request.POST.get('phone')
    assunto = request.POST.get('subject')
    mensagem = request.POST.get('message')

    # Validação básica
    if not all([nome, email, mensagem]):
        return JsonResponse({
            'success': False, 
            'error': 'Nome, email e mensagem são obrigatórios'
        })

    # Aqui você pode salvar no banco, enviar email, ou só logar
    logger.info(f'Formulário de contato: {nome}, {email}, {telefone}, {assunto}, {mensagem}')

    # Resposta JSON para AJAX ou redirecionamento
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': 'Mensagem enviada com sucesso!'
        })
    
    return redirect('index')


def login_page(request):
    """Página de login pública"""
    return render(request, 'core/front-end/login.html')


def esqueceu_senha_page(request):
    """Página de recuperação de senha pública"""
    return render(request, 'core/front-end/esqueceusenha.html')


def criar_conta_page(request):
    """Página de criação de conta pública"""
    return render(request, 'core/front-end/criarconta.html')


# ==================== API PARA VERIFICAR PERMISSÕES ====================
class CheckAuthView(APIView):
    """API para verificar autenticação e permissões do usuário"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Retorna informações do usuário atual"""
        if request.user.is_authenticated:
            serializer = UserSerializer(request.user)
            return Response({
                'authenticated': True,
                'user': serializer.data,
                'is_admin': request.user.is_admin
            })
        
        return Response({
            'authenticated': False,
            'user': None,
            'is_admin': False
        })