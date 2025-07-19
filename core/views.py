from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate,logout
from .serializers import UserSerializer, RegisterSerializer,ProdutoSerializer
from rest_framework.permissions import AllowAny
from .models import User,Produto
from rest_framework import viewsets #alteração recente para corrigir o erro de migrations da model produtos
from django.shortcuts import render,redirect
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from django.views.decorators.http import require_http_methods

def home(request):
    return HttpResponse("Bem-vindo ao especialista de carros!")

class LoginView(APIView):
    permission_classes = [AllowAny]  # Permite acesso sem autenticação
    
    def post(self, request):
        print("LoginView POST recebido")
        email = request.data.get('email')
        password = request.data.get('senha')  # Mantendo 'senha' como no seu frontend

        # Validação básica dos campos
        if not email or not password:
            return Response(
                {'error': 'Email e senha são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, email=email, password=password)
        if user is not None:
            serializer = UserSerializer(user)
            return Response(
                {
                    'message': 'Login realizado com sucesso',
                    'user': serializer.data
                },
                status=status.HTTP_200_OK
            )
        return Response(
            {'error': 'Email ou senha incorretos'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Usuário criado com sucesso",
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        # Formata erros de validação
        errors = {}
        for field, error_list in serializer.errors.items():
            errors[field] = ' '.join([str(e) for e in error_list])
            
        return Response({
            "error": "Dados inválidos",
            "details": errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    parser_classes = [FormParser, MultiPartParser, JSONParser]

def produtos_listagem(request):
   produtos = Produto.objects.all()
   return render(request, 'core/front-end/index.html', {'produtos': produtos})

def admin_index(request):
    site_language = request.GET.get('site_language', 'pt-BR')
    allowed_status = ['Todos', 'Pendente', 'Processando', 'Enviado', 'Entregue', 'Cancelado']
    status = request.GET.get('status', 'Todos')
    if status not in allowed_status:
        status = 'Todos'
    
    context = {
        'status': status,
        'site_language': site_language,
    }
    
    return render(request, 'core/admin-front-end/admin_index.html', context)

def logout_view(request):
    logout(request)
    return redirect('admin_index')  # Ou redirecione pra qualquer outra página sua

def carrinho(request):
    # lógica do carrinho
    return render(request, 'core/front-end/carrinho.html')

@require_http_methods(["POST"])
def contato_envio(request):
    # Pega os dados do formulário
    nome = request.POST.get('name')
    email = request.POST.get('email')
    telefone = request.POST.get('phone')
    assunto = request.POST.get('subject')
    mensagem = request.POST.get('message')

    # Aqui você pode salvar no banco, enviar email, ou só logar
    print(f'Contato: {nome}, {email}, {telefone}, {assunto}, {mensagem}')

    # Depois redireciona para a página onde o form está, ou uma página de sucesso
    return redirect('index')  # Ou qualquer outra página que quiser

def login_page(request):
    return render(request, 'core/front-end/login.html')

def esqueceu_senha_page(request):
    return render(request, 'core/front-end/esqueceusenha.html')

def criar_conta_page(request):
    return render(request, 'core/front-end/criarconta.html')
