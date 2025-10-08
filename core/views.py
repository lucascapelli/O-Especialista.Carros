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

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, BasePermission, SAFE_METHODS
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.decorators import action

from .serializers import UserSerializer, RegisterSerializer, ProdutoSerializer
from .models import User, Produto, Carrinho, ItemCarrinho

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
        return redirect('login_page')  # Redireciona para login se não for admin
    
    site_language = request.GET.get('site_language', 'pt-BR')
    allowed_status = ['Todos', 'Pendente', 'Processando', 'Enviado', 'Entregue', 'Cancelado']
    status_filter = request.GET.get('status', 'Todos')
    
    if status_filter not in allowed_status:
        status_filter = 'Todos'
    
    context = {
        'status': status_filter,
        'site_language': site_language,
        'is_admin': True  # Para uso no template
    }

    # ---------------------------------------------------------------
    # 🔽 NOVO BLOCO INSERIDO (DADOS DE DASHBOARD / MOCKS / CONSULTAS)
    # ---------------------------------------------------------------
    if request.user.is_authenticated and request.user.is_admin:
        # Dados mock para o dashboard (substitua pelos seus dados reais)
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
                # Adicione mais pedidos conforme necessário
            ],
            'recent_products': Produto.objects.all()[:5],
            'products': Produto.objects.all(),
            'users': User.objects.regular_users(),  # todos os usuários comuns
            'admins': User.objects.admins(),        # todos os admins, se precisar

            'user_roles': ['Admin', 'Vendedor', 'Cliente']
        })
    # ---------------------------------------------------------------

    logger.info(f"Admin acessou painel: {request.user.email}")
    return render(request, 'core/admin-front-end/admin_index.html', context)

# ==================== ADMIN LOGIN ====================
@csrf_protect
def admin_login(request):
    """View específica para login administrativo"""
    if request.user.is_authenticated and request.user.is_admin:
        return redirect('admin_index')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        remember_me = request.POST.get('remember_me')
        
        # Autentica o usuário
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_admin:  # Verifica se é admin
                auth_login(request, user)
                
                # Configura sessão baseada no "Lembrar-me"
                if not remember_me:
                    request.session.set_expiry(0)  # Sessão de browser
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
        return redirect('login_page')  # se veio do admin, volta pro login
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
def adicionar_carrinho(request, produto_id):
    """Adiciona item ao carrinho - acesso público"""
    produto = get_object_or_404(Produto, id=produto_id)
    carrinho_obj = get_or_create_carrinho(request)
    
    # Verifica se o item já existe
    item, created = ItemCarrinho.objects.get_or_create(
        carrinho=carrinho_obj,
        produto=produto,
        defaults={'preco_unitario': produto.preco}
    )
    
    if not created:
        item.quantidade += 1
        item.save()
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'total_itens': carrinho_obj.total_itens,
            'message': 'Produto adicionado ao carrinho!'
        })
    
    return redirect('carrinho')


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