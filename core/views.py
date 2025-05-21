from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from .serializers import UserSerializer

def home(request):
    return HttpResponse("Bem-vindo ao especialista de carros!")

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('senha')  # seu campo no formulário é 'senha'

        user = authenticate(request, email=email, password=password)
        if user is not None:
            serializer = UserSerializer(user)
            return Response(serializer.data)
        else:
            return Response({'error': 'Credenciais inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
