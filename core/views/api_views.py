# views/api_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings
from django.contrib.auth import get_user_model
from ..serializers import UserSerializer

User = get_user_model()

@api_view(['GET'])
@permission_classes([AllowAny])
def check_auth(request):
    return Response({
        'authenticated': request.user.is_authenticated,
        'user': {
            'email': request.user.email if request.user.is_authenticated else None,
            'first_name': request.user.first_name if request.user.is_authenticated else None,
            'last_name': request.user.last_name if request.user.is_authenticated else None,
        } if request.user.is_authenticated else None
    })

class CheckAuthView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def atualizar_perfil(request):
    try:
        user = request.user
        data = request.data.copy()
        data.pop('is_admin', None)
        data.pop('is_staff', None)
        data.pop('is_superuser', None)
        serializer = UserSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Perfil atualizado!', 'user': serializer.data})
        return Response({'error': 'Dados inválidos', 'details': serializer.errors}, status=400)
    except Exception as e:
        return Response({'error': 'Erro interno'}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def api_esqueceu_senha(request):
    """API para usuário solicitar reset de senha via AJAX"""
    email = request.data.get('email')
    
    try:
        user = User.objects.get(email=email)
        
        # GERAR TOKEN E URL
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_url = f"{settings.FRONTEND_URL}/password-reset/{uid}/{token}/"
        
        # ENVIAR EMAIL
        user_name = user.first_name or user.email
        
        send_mail(
            subject="Redefinição de Senha - Especialista Carros",
            message=f"""
            Olá {user_name},
            
            Você solicitou a redefinição da sua senha.
            
            Clique no link abaixo para definir uma nova senha:
            {reset_url}
            
            Este link expira em 24 horas.
            
            Se você não solicitou esta redefinição, ignore este email.
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Redefinição de Senha</h2>
                <p>Olá <strong>{user_name}</strong>,</p>
                <p>Você solicitou a redefinição da sua senha.</p>
                <p>Para definir uma nova senha, clique no botão abaixo:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Redefinir Senha
                    </a>
                </div>
                <p><strong>Este link expira em 24 horas.</strong></p>
                <p>Se você não solicitou esta redefinição, ignore este email.</p>
            </div>
            """,
            fail_silently=False,
        )
        
        return Response({
            'success': True,
            'message': 'Enviamos um email com instruções para redefinir sua senha!'
        })
        
    except User.DoesNotExist:
        return Response({
            'success': True,
            'message': 'Se o email existir em nosso sistema, enviamos instruções para redefinição de senha.'
        })