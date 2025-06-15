from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from .serializers import UserSerializer, RegisterSerializer,ProdutoSerializer
from rest_framework.permissions import AllowAny
from .models import User,Produto
from rest_framework import viewsets #alteração recente para corrigir o erro de migrations da model produtos


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