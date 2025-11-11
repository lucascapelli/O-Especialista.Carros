# core/views/shipping_views.py
"""
Views para integração com serviços de frete e rastreamento
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from ..services.shipping_service import ShippingService


@csrf_exempt
@require_http_methods(["POST"])
def simular_frete_api(request):
    """
    View para simulação de frete via API
    """
    try:
        data = json.loads(request.body)
        
        # Extrair dados da requisição
        origem_cep = data.get('origem_cep')
        destino_cep = data.get('destino_cep')
        itens_pedido = data.get('itens', [])
        
        # Validar dados obrigatórios
        if not all([origem_cep, destino_cep, itens_pedido]):
            return JsonResponse({
                'erro': 'Dados incompletos. Forneça origem_cep, destino_cep e itens.'
            }, status=400)
        
        # Inicializar serviço de frete
        shipping_service = ShippingService()
        
        # Simular frete
        resultado = shipping_service.calcular_frete(origem_cep, destino_cep, itens_pedido)
        
        # Retornar resposta
        if resultado.get('erro'):
            return JsonResponse(resultado, status=400)
        else:
            return JsonResponse(resultado)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'erro': 'JSON inválido no corpo da requisição'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'erro': f'Erro interno do servidor: {str(e)}'
        }, status=500)


@require_http_methods(["GET"])
def rastrear_pedido_api(request, codigo):
    """
    View para rastreamento de pedido via API
    """
    try:
        # Validar código de rastreio
        if not codigo or len(codigo.strip()) < 5:
            return JsonResponse({
                'erro': 'Código de rastreio inválido'
            }, status=400)
        
        # Inicializar serviço de frete
        shipping_service = ShippingService()
        
        # Rastrear pedido
        resultado = shipping_service.rastrear(codigo.strip())
        
        # Retornar resposta
        if resultado.get('erro'):
            return JsonResponse(resultado, status=400)
        else:
            return JsonResponse(resultado)
            
    except Exception as e:
        return JsonResponse({
            'erro': f'Erro interno do servidor: {str(e)}'
        }, status=500)