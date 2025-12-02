# views/public_views.py
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.contrib import messages
from ..models import Produto
import logging

logger = logging.getLogger(__name__)

def home(request):
    return HttpResponse("Bem-vindo ao especialista de carros!")

def index(request):
    # ✅ APENAS produtos ATIVOS na home
    produtos = Produto.objects.filter(status='Ativo')[:8]
    return render(request, 'core/front-end/index.html', {'produtos': produtos})

def produtos_listagem(request):
    # ✅ APENAS produtos ATIVOS na listagem
    produtos = Produto.objects.filter(status='Ativo')
    return render(request, 'core/front-end/produtos_listagem.html', {'produtos': produtos})

def detalhes_produto(request, produto_id):
    """View para página de detalhes do produto com galeria"""
    # ✅ Permite ver detalhes mesmo de produtos inativos (para links compartilhados)
    produto = get_object_or_404(Produto, id=produto_id)
    
    # ✅ Produtos relacionados só os ATIVOS
    produtos_relacionados = Produto.objects.filter(
        categoria=produto.categoria,
        status='Ativo'
    ).exclude(id=produto.id)[:4]
    
    context = {
        'produto': produto,
        'produtos_relacionados': produtos_relacionados,
    }
    
    return render(request, 'core/front-end/detalhes_produto.html', context)

@require_http_methods(["POST"])
@csrf_protect
def contato_envio(request):
    nome = request.POST.get('name')
    email = request.POST.get('email')
    telefone = request.POST.get('phone')
    assunto = request.POST.get('subject')
    mensagem = request.POST.get('message')
    if not all([nome, email, mensagem]):
        return JsonResponse({
            'success': False,
            'error': 'Nome, email e mensagem são obrigatórios'
        })
    logger.info(f'Formulário de contato: {nome}, {email}, {telefone}, {assunto}, {mensagem}')
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True,
            'message': 'Mensagem enviada com sucesso!'
        })
    return redirect('index')

def login_page(request):
    return render(request, 'core/front-end/login.html')

def esqueceu_senha_page(request):
    return render(request, 'core/front-end/esqueceusenha.html')

def criar_conta_page(request):
    return render(request, 'core/front-end/criarconta.html')