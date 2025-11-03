// Função para pegar o CSRFToken
function getCSRFToken() {
    const name = 'csrftoken=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookies = decodedCookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let c = cookies[i].trim();
        if (c.startsWith(name)) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

// Toast notifications
function showToast(message, type = 'success') {
    // Remove toast existente se houver
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 text-white font-medium ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Verificar se usuário está autenticado
async function checkUserAuthentication() {
    try {
        const response = await fetch('/api/check-auth/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.authenticated;
        }
        return false;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return false;
    }
}

// Adicionar esta função para atualizar info de usuário
async function updateUserInfo() {
    const isAuthenticated = await checkUserAuthentication();
    const authInfo = document.getElementById('user-auth-info');
    const notAuthInfo = document.getElementById('user-not-auth-info');
    const userEmail = document.getElementById('user-email');
    
    if (authInfo && notAuthInfo) {
        if (isAuthenticated) {
            authInfo.classList.remove('hidden');
            notAuthInfo.classList.add('hidden');
            // Você pode buscar mais informações do usuário se necessário
        } else {
            authInfo.classList.add('hidden');
            notAuthInfo.classList.remove('hidden');
        }
    }
}

// Modal de login
function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">Login Necessário</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <p class="text-gray-600 mb-4">Você precisa estar logado para finalizar a compra.</p>
            <div class="flex space-x-3">
                <button onclick="redirectToLogin()" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
                    Fazer Login
                </button>
                <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition">
                    Continuar Comprando
                </button>
            </div>
            <p class="text-sm text-gray-500 mt-4 text-center">
                Não tem conta? <a href="/criar-conta/" class="text-blue-600 hover:underline">Cadastre-se</a>
            </p>
        </div>
    `;
    document.body.appendChild(modal);
}

// Redirecionar para login
function redirectToLogin() {
    // Salvar a página atual para voltar após login
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = '/login/';
}

// Atualizar resumo do carrinho
async function atualizarCarrinhoResumo() {
    try {
        const response = await fetch('/carrinho-json/');
        if (!response.ok) throw new Error('Erro ao carregar carrinho');
        
        const data = await response.json();
        
        // Atualizar resumo
        document.getElementById('resumo-subtotal').textContent = `R$ ${data.subtotal.toFixed(2)}`;
        document.getElementById('resumo-total').textContent = `R$ ${data.total.toFixed(2)}`;
        
        // Atualizar contador de itens
        const cartItemsCount = document.getElementById('cart-items-count');
        if (cartItemsCount) {
            cartItemsCount.textContent = `${data.total_itens} ${data.total_itens === 1 ? 'item' : 'itens'}`;
        }
        
        // Atualizar badge do carrinho na navegação
        const cartBadge = document.getElementById('cart-count');
        if (cartBadge) {
            cartBadge.textContent = data.total_itens;
        }
        
        // Se carrinho vazio, mostrar mensagem
        if (data.total_itens === 0) {
            document.getElementById('cart-items-container').innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-shopping-cart text-6xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-500 mb-4">Seu carrinho está vazio</p>
                    <a href="/home/#products" 
                       class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-store mr-2"></i>
                        Ver produtos
                    </a>
                </div>
            `;
            // Esconder botão finalizar compra
            const finalizarBtn = document.getElementById('finalizar-compra');
            if (finalizarBtn) {
                finalizarBtn.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Erro ao atualizar carrinho:', error);
        showToast('Erro ao atualizar carrinho', 'error');
    }
}

// Alterar quantidade do item
async function alterarQuantidade(itemId, change) {
    try {
        const quantityElement = document.getElementById(`quantity-${itemId}`);
        if (!quantityElement) return;
        
        const currentQuantity = parseInt(quantityElement.textContent);
        const newQuantity = currentQuantity + change;
        
        if (newQuantity < 1) {
            await removerItem(itemId);
            return;
        }
        
        const response = await fetch(`/alterar-quantidade/${itemId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                quantidade: newQuantity
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Atualizar quantidade no DOM
            quantityElement.textContent = newQuantity;
            
            // Atualizar subtotal do item
            const subtotalElement = document.getElementById(`subtotal-${itemId}`);
            if (subtotalElement) {
                subtotalElement.textContent = data.subtotal_item.toFixed(2);
            }
            
            // Atualizar resumo geral
            await atualizarCarrinhoResumo();
            showToast('Quantidade atualizada!', 'success');
        } else {
            showToast(data.error || 'Erro ao atualizar quantidade', 'error');
        }
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão', 'error');
    }
}

// Remover item do carrinho
async function removerItem(itemId) {
    if (!confirm('Tem certeza que deseja remover este item do carrinho?')) {
        return;
    }
    
    try {
        const response = await fetch(`/remover_carrinho/${itemId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Remover item do DOM
            const itemElement = document.getElementById(`item-${itemId}`);
            if (itemElement) {
                itemElement.style.opacity = '0';
                setTimeout(() => {
                    itemElement.remove();
                    // Verificar se ainda há itens
                    const remainingItems = document.querySelectorAll('[id^="item-"]');
                    if (remainingItems.length === 0) {
                        atualizarCarrinhoResumo();
                    }
                }, 300);
            }
            
            showToast('Item removido do carrinho', 'success');
        } else {
            showToast(data.error || 'Erro ao remover item', 'error');
        }
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão', 'error');
    }
}

// Função para criar pedido (após verificação de login)
async function criarPedido() {
    const finalizarBtn = document.getElementById('finalizar-compra');
    
    try {
        // Mostrar loading
        const originalText = finalizarBtn.innerHTML;
        finalizarBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
        finalizarBtn.disabled = true;

        // Coletar endereço de entrega
        const enderecoEntrega = {
            rua: "Rua do Cliente",  // TODO: Coletar do usuário
            numero: "123",
            bairro: "Centro", 
            cidade: "São Paulo",
            estado: "SP",
            cep: "01000-000"
        };

        const response = await fetch('/api/pedido/criar/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                metodo_pagamento: "pix",
                endereco_entrega: enderecoEntrega
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Pedido criado com sucesso! Redirecionando...', 'success');
            
            // Redirecionar para página de pagamento ou detalhes do pedido
            setTimeout(() => {
                if (data.pagamento_url) {
                    window.location.href = data.pagamento_url;
                } else if (data.pedido_id) {
                    window.location.href = `/pedido/${data.pedido_id}/`;
                } else if (data.numero_pedido) {
                    // Fallback - mostrar número do pedido
                    alert(`Pedido criado! Número: ${data.numero_pedido}`);
                    window.location.href = '/';
                } else {
                    // Fallback - redirecionar para home
                    window.location.href = '/';
                }
            }, 2000);
            
        } else {
            showToast('Erro: ' + (data.error || 'Erro ao criar pedido'), 'error');
        }
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão ao finalizar compra', 'error');
    } finally {
        // Restaurar botão
        if (finalizarBtn) {
            finalizarBtn.innerHTML = 'Finalizar Compra';
            finalizarBtn.disabled = false;
        }
    }
}

// Finalizar compra - VERSÃO CORRIGIDA COM VERIFICAÇÃO DE LOGIN
document.addEventListener('DOMContentLoaded', function() {
    const finalizarBtn = document.getElementById('finalizar-compra');
    
    if (finalizarBtn) {
        finalizarBtn.addEventListener('click', async function() {
            try {
                // Verificar se carrinho não está vazio
                const cartCountElement = document.getElementById('cart-items-count');
                if (!cartCountElement) {
                    showToast('Erro: não foi possível verificar o carrinho', 'error');
                    return;
                }
                
                const cartCount = parseInt(cartCountElement.textContent);
                if (cartCount === 0) {
                    showToast('Seu carrinho está vazio!', 'error');
                    return;
                }

                // Verificar se usuário está logado
                const userIsAuthenticated = await checkUserAuthentication();
                if (!userIsAuthenticated) {
                    showLoginModal();
                    return;
                }

                // Se chegou aqui, usuário está logado - criar pedido
                await criarPedido();
                
            } catch (error) {
                console.error('Erro:', error);
                showToast('Erro ao processar pedido', 'error');
            }
        });
    }

    // Inicializar contador do carrinho
    atualizarCarrinhoResumo();
    updateUserInfo(); // ✅ ADICIONAR ESTA LINHA
});

// Adicionar produto ao carrinho (para usar em outras páginas)
async function adicionarAoCarrinho(produtoId) {
    try {
        const response = await fetch(`/adicionar_carrinho/${produtoId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Produto adicionado ao carrinho!', 'success');
            // Atualizar contador se estiver na página do carrinho
            if (window.location.pathname === '/carrinho/') {
                await atualizarCarrinhoResumo();
            }
        } else {
            showToast(data.error || 'Erro ao adicionar produto', 'error');
        }
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão', 'error');
    }
}