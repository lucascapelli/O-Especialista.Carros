# views/auth_views.py
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from django.contrib.auth import update_session_auth_hash
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from ..serializers import UserSerializer, RegisterSerializer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

# ==== API LOGIN ====
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info(f"Tentativa de login: {request.data.get('email')}")
        email = request.data.get('email')
        password = request.data.get('senha')

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
            return Response({
                'message': 'Login realizado com sucesso',
                'user': serializer.data,
                'is_admin': user.is_admin,
                'redirect_to': '/'
            }, status=status.HTTP_200_OK)

        logger.warning(f"Tentativa de login falhou: {email}")
        return Response(
            {'error': 'Email ou senha incorretos'},
            status=status.HTTP_401_UNAUTHORIZED
        )

# ==== API REGISTRO ====
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()
        data['is_admin'] = False
        serializer = RegisterSerializer(data=data)

        if serializer.is_valid():
            user = serializer.save()
            logger.info(f"Novo usuário registrado: {user.email}")
            return Response({
                "message": "Usuário criado com sucesso",
                "redirect_to": "/login/"
            }, status=status.HTTP_201_CREATED)

        errors = {
            field: ' '.join([str(e) for e in error_list])
            for field, error_list in serializer.errors.items()
        }

        return Response({
            "error": "Dados inválidos",
            "details": errors
        }, status=status.HTTP_400_BAD_REQUEST)

# ==== LOGIN ADMIN ====
@csrf_protect
def admin_login(request):
    from django.contrib.auth import authenticate as auth_auth, login as auth_login

    if request.user.is_authenticated and getattr(request.user, 'is_admin', False):
        return redirect('admin_index')

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        remember_me = request.POST.get('remember_me')

        user = auth_auth(request, username=username, password=password)
        if user is not None and getattr(user, 'is_admin', False):
            auth_login(request, user)

            if not remember_me:
                request.session.set_expiry(0)
            else:
                request.session.set_expiry(1209600)

            logger.info(f"Admin logado com sucesso: {user.email}")
            return redirect('admin_index')

        messages.error(
            request,
            'Acesso permitido apenas para administradores.' if user else 'Usuário ou senha incorretos.'
        )

    return render(request, 'core/admin-front-end/admin-login.html')

# ==== CONFIRMAÇÃO DE REDEFINIÇÃO DE SENHA ====
def password_reset_confirm(request, uidb64=None, token=None):
    """View para confirmar redefinição de senha - usuário define nova senha"""
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        if request.method == 'POST':
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')
            
            if new_password and new_password == confirm_password:
                user.set_password(new_password)
                user.save()
                update_session_auth_hash(request, user)
                messages.success(request, 'Senha redefinida com sucesso!')
                return redirect('login')
            else:
                messages.error(request, 'As senhas não coincidem.')
        
        return render(request, 'core/front-end/password_reset_confirm.html')
    else:
        return render(request, 'core/front-end/password_reset_invalid.html', 
                     {'message': 'Link inválido ou expirado.'})

# ==== LOGOUT ====
def logout_view(request):
    user_email = request.user.email if request.user.is_authenticated else 'Anônimo'
    logger.info(f"Logout realizado: {user_email}")
    logout(request)

    if request.path.startswith('/admin-panel/'):
        return redirect('admin_login')

    return redirect('index')