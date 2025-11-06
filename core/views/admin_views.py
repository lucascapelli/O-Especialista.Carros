# core/views/admin_views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db import models
from django.utils import timezone
from ..models import User, Produto, Pedido  # <-- CORRETO: .models (dentro do app core)
from core.models.orders import StatusPedido
import logging

logger = logging.getLogger(__name__)

# ===================== PERFIL USUÁRIO =====================
@login_required
def perfil_usuario(request):
    return render(request, 'core/front-end/perfil.html', {'usuario': request.user})

# ===================== ADMIN INDEX =====================
@csrf_protect
def admin_index(request):
    if not request.user.is_authenticated or not request.user.is_admin:
        logger.warning(f"Acesso negado à admin_index - Usuário: {request.user}")
        return redirect('admin_login')

    site_language = request.GET.get('site_language', 'pt-BR')
    allowed_status = ['Todos', 'Pendente', 'Processando', 'Enviado', 'Entregue', 'Cancelado']
    status_filter = request.GET.get('status', 'Todos')
    section = request.GET.get('section', 'dashboard')

    if status_filter not in allowed_status:
        status_filter = 'Todos'

    # Filtro de usuários
    users_list = User.objects.all().order_by('-id')
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

    # Context base
    context = {
        'status': status_filter,
        'site_language': site_language,
        'is_admin': True,
        'current_section': section
    }

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

        if section == 'vendas':
            from core.models.orders import Pedido
            from django.db.models import Sum, Count, Avg

            hoje = timezone.now().date()
            total_pedidos = Pedido.objects.all()
            pedidos_hoje = total_pedidos.filter(criado_em__date=hoje)
            pedidos_pendentes = total_pedidos.filter(status__nome='Pendente')

            sales_stats = {
                'total_sales': float(total_pedidos.aggregate(total=Sum('total_final'))['total'] or 0),
                'sales_growth': 12.5,
                'orders_today': pedidos_hoje.count(),
                'orders_today_change': '+2',
                'pending_orders': pedidos_pendentes.count(),
                'pending_orders_change': -2,
                'average_ticket': float(total_pedidos.aggregate(avg=Avg('total_final'))['avg'] or 0),
                'average_ticket_growth': 5.2
            }
            context['sales_stats'] = sales_stats

            orders_search = request.GET.get('search', '')
            orders_status = request.GET.get('status', 'Todos')
            orders_list = Pedido.objects.all().select_related(
                'usuario', 'status', 'pagamento', 'pagamento__metodo'
            ).order_by('-criado_em')

            if orders_status != 'Todos':
                orders_list = orders_list.filter(status__nome=orders_status)
            if orders_search:
                orders_list = orders_list.filter(
                    models.Q(numero_pedido__icontains=orders_search) |
                    models.Q(usuario__first_name__icontains=orders_search) |
                    models.Q(usuario__last_name__icontains=orders_search) |
                    models.Q(usuario__email__icontains=orders_search)
                )

            orders_paginator = Paginator(orders_list, 10)
            orders_page_number = request.GET.get('page', 1)
            orders_page = orders_paginator.get_page(orders_page_number)
            context.update({
                'orders': orders_page,
                'sales_stats': sales_stats
            })

    logger.info(f"Admin acessou painel: {request.user.email} - Seção: {section}")
    return render(request, 'core/admin-front-end/admin_index.html', context)

# ===================== DELETE USER =====================
@require_http_methods(["POST"])  # <-- MUDOU PARA POST
@csrf_protect
def delete_user(request, user_id):
    if not request.user.is_authenticated or not request.user.is_admin:
        return JsonResponse({'success': False, 'error': 'Permissão negada'}, status=403)
    try:
        user_to_delete = get_object_or_404(User, id=user_id)
        if user_to_delete.id == request.user.id:
            return JsonResponse({'success': False, 'error': 'Você não pode excluir sua própria conta.'}, status=400)
        logger.info(f"Usuário {user_to_delete.email} excluído por admin: {request.user.email}")
        user_to_delete.delete()
        return JsonResponse({'success': True, 'message': 'Usuário excluído com sucesso!'})
    except Exception as e:
        logger.error(f"Erro ao excluir usuário {user_id}: {str(e)}")
        return JsonResponse({'success': False, 'error': f'Erro: {str(e)}'}, status=500)

# ===================== ADMIN PEDIDOS =====================
@login_required
def admin_pedidos(request):
    if not request.user.is_admin:
        return redirect('admin_login')
    status_filter = request.GET.get('status', 'todos')
    search_query = request.GET.get('search', '')
    pedidos = Pedido.objects.all().order_by('-criado_em')
    if status_filter != 'todos':
        pedidos = pedidos.filter(status__nome=status_filter)
    if search_query:
        pedidos = pedidos.filter(
            models.Q(numero_pedido__icontains=search_query) |
            models.Q(usuario__email__icontains=search_query) |
            models.Q(usuario__first_name__icontains=search_query) |
            models.Q(usuario__last_name__icontains=search_query)
        )
    paginator = Paginator(pedidos, 10)
    page_number = request.GET.get('page', 1)
    pedidos_page = paginator.get_page(page_number)
    return render(request, 'core/admin-front-end/admin_pedidos.html', {
        'pedidos': pedidos_page,
        'status_filter': status_filter,
        'search_query': search_query
    })

# ===================== ADMIN PRODUTOS =====================
@login_required
def admin_produtos(request):
    if not request.user.is_admin:
        return redirect('admin_login')
    search_query = request.GET.get('search', '')
    categoria_filter = request.GET.get('categoria', '')
    produtos = Produto.objects.all().order_by('-criado_em')
    if search_query:
        produtos = produtos.filter(models.Q(nome__icontains=search_query) | models.Q(descricao__icontains=search_query))
    if categoria_filter:
        produtos = produtos.filter(categoria=categoria_filter)
    paginator = Paginator(produtos, 10)
    page_number = request.GET.get('page', 1)
    produtos_page = paginator.get_page(page_number)
    return render(request, 'core/admin-front-end/admin_produtos.html', {
        'produtos': produtos_page,
        'search_query': search_query,
        'categoria_filter': categoria_filter
    })

# ===================== ATUALIZAR STATUS PEDIDO =====================
@require_http_methods(["POST"])
@csrf_protect
@login_required
def atualizar_status_pedido(request, pedido_id):
    if not request.user.is_admin:
        return JsonResponse({'success': False, 'error': 'Permissão negada'}, status=403)
    try:
        pedido = get_object_or_404(Pedido, id=pedido_id)
        novo_status_id = request.POST.get('status_id')
        novo_status = get_object_or_404(StatusPedido, id=novo_status_id)
        pedido.status = novo_status
        pedido.save()
        logger.info(f"Status do pedido {pedido_id} atualizado para {novo_status.nome}")
        return JsonResponse({
            'success': True,
            'message': f'Status atualizado para {novo_status.nome}!',
            'novo_status': novo_status.nome,
            'cor_status': novo_status.cor
        })
    except Exception as e:
        logger.error(f"Erro ao atualizar status: {str(e)}")
        return JsonResponse({'success': False, 'error': f'Erro: {str(e)}'}, status=500)