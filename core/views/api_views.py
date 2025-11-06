# views/api_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from ..serializers import UserSerializer

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