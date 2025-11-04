// ===== DEBUG MELHORADO =====
console.log('✅ carrinho.js carregado!');
console.log('DOM Content carregado?', document.readyState);

// ===== INICIALIZAÇÃO DO CARRINHO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ carrinho.js - DOM totalmente carregado');
    
    // Debug: verificar todos os elementos importantes
    const finalizarBtn = document.getElementById('finalizar-compra');
    console.log('Botão finalizar encontrado:', finalizarBtn);
    
    const cartItems = document.querySelectorAll('[id^="item-"]');
    console.log('Itens do carrinho encontrados:', cartItems.length);
    
    const quantityButtons = document.querySelectorAll('[onclick*="alterarQuantidade"]');
    console.log('Botões de quantidade encontrados:', quantityButtons.length);
    
    const removeButtons = document.querySelectorAll('[onclick*="removerItem"]');
    console.log('Botões de remover encontrados:', removeButtons.length);

    // Inicializar funções
    inicializarEventListeners();
    atualizarCarrinhoResumo();
});

// ===== INICIALIZAR EVENT LISTENERS =====
function inicializarEventListeners() {
    console.log('🔄 Inicializando event listeners...');
    
    // Botão finalizar compra
    const finalizarBtn = document.getElementById('finalizar-compra');
    if (finalizarBtn) {
        finalizarBtn.addEventListener('click', handleFinalizarCompra);
        console.log('✅ Event listener adicionado ao botão finalizar');
    } else {
        console.log('❌ Botão finalizar-compra não encontrado!');
    }

    // Delegation para botões de quantidade e remover
    document.addEventListener('click', function(event) {
        // Botões de aumentar quantidade
        if (event.target.matches('.btn-aumentar') || event.target.closest('.btn-aumentar')) {
            const button = event.target.matches('.btn-aumentar') ? event.target : event.target.closest('.btn-aumentar');
            const itemId = button.dataset.itemId;
            if (itemId) {
                console.log('🔼 Botão aumentar clicado para item:', itemId);
                alterarQuantidade(itemId, 1);
            }
        }
        
        // Botões de diminuir quantidade
        if (event.target.matches('.btn-diminuir') || event.target.closest('.btn-diminuir')) {
            const button = event.target.matches('.btn-diminuir') ? event.target : event.target.closest('.btn-diminuir');
            const itemId = button.dataset.itemId;
            if (itemId) {
                console.log('🔽 Botão diminuir clicado para item:', itemId);
                alterarQuantidade(itemId, -1);
            }
        }
        
        // Botões de remover
        if (event.target.matches('.btn-remover') || event.target.closest('.btn-remover')) {
            const button = event.target.matches('.btn-remover') ? event.target : event.target.closest('.btn-remover');
            const itemId = button.dataset.itemId;
            if (itemId) {
                console.log('🗑️ Botão remover clicado para item:', itemId);
                removerItem(itemId);
            }
        }
    });
}

// ===== HANDLER DO BOTÃO FINALIZAR =====
async function handleFinalizarCompra() {
    console.log('✅ Botão finalizar clicado!');
    
    try {
        // Verificar se carrinho não está vazio
        const cartResponse = await fetch('/carrinho-json/');
        if (!cartResponse.ok) throw new Error('Erro ao verificar carrinho');
        
        const cartData = await cartResponse.json();
        console.log('Dados do carrinho:', cartData);
        
        if (cartData.total_itens === 0) {
            showToast('Seu carrinho está vazio!', 'error');
            return;
        }

        // Verificar se usuário está logado
        console.log('Verificando autenticação...');
        const userIsAuthenticated = await checkUserAuthentication();
        console.log('Usuário autenticado:', userIsAuthenticated);
        
        if (!userIsAuthenticated) {
            showLoginModal();
            return;
        }

        // Se chegou aqui, usuário está logado - criar pedido
        console.log('Iniciando criação de pedido...');
        await criarPedido();
        
    } catch (error) {
        console.error('Erro no click:', error);
        showToast('Erro ao processar pedido: ' + error.message, 'error');
    }
}

// ===== FUNÇÕES ESPECÍFICAS DO CARRINHO =====

// Atualizar resumo do carrinho
async function atualizarCarrinhoResumo() {
    console.log('🔄 Atualizando resumo do carrinho...');
    try {
        const response = await fetch('/carrinho-json/');
        if (!response.ok) throw new Error('Erro ao carregar carrinho');
        
        const data = await response.json();
        console.log('Dados do carrinho recebidos:', data);
        
        // Atualizar resumo
        const subtotalElement = document.getElementById('resumo-subtotal');
        const totalElement = document.getElementById('resumo-total');
        
        if (subtotalElement) {
            subtotalElement.textContent = `R$ ${data.subtotal.toFixed(2)}`;
            console.log('Subtotal atualizado:', subtotalElement.textContent);
        }
        if (totalElement) {
            totalElement.textContent = `R$ ${data.total.toFixed(2)}`;
            console.log('Total atualizado:', totalElement.textContent);
        }
        
        // Atualizar contador de itens
        const cartItemsCount = document.getElementById('cart-items-count');
        if (cartItemsCount) {
            cartItemsCount.textContent = `${data.total_itens} ${data.total_itens === 1 ? 'item' : 'itens'}`;
            console.log('Contador de itens atualizado:', cartItemsCount.textContent);
        }
        
        // Se carrinho vazio, mostrar mensagem
        if (data.total_itens === 0) {
            console.log('🛒 Carrinho vazio detectado');
            const cartContainer = document.getElementById('cart-items-container');
            if (cartContainer) {
                cartContainer.innerHTML = `
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
            }
            
            // Esconder botão finalizar compra
            const finalizarBtn = document.getElementById('finalizar-compra');
            if (finalizarBtn) {
                finalizarBtn.style.display = 'none';
                console.log('❌ Botão finalizar escondido - carrinho vazio');
            }
        } else {
            console.log('✅ Carrinho com itens, botão finalizar visível');
        }
        
    } catch (error) {
        console.error('Erro ao atualizar carrinho:', error);
        showToast('Erro ao atualizar carrinho', 'error');
    }
}

// Alterar quantidade do item
async function alterarQuantidade(itemId, change) {
    console.log(`🔄 Alterando quantidade do item ${itemId}: ${change > 0 ? '+' : ''}${change}`);
    try {
        const quantityElement = document.getElementById(`quantity-${itemId}`);
        if (!quantityElement) {
            console.log('❌ Elemento de quantidade não encontrado para item:', itemId);
            return;
        }
        
        const currentQuantity = parseInt(quantityElement.textContent);
        const newQuantity = currentQuantity + change;
        console.log(`Quantidade atual: ${currentQuantity}, nova: ${newQuantity}`);
        
        if (newQuantity < 1) {
            console.log('❌ Quantidade menor que 1, removendo item...');
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
        console.log('Resposta da alteração de quantidade:', data);
        
        if (data.success) {
            // Atualizar quantidade no DOM
            quantityElement.textContent = newQuantity;
            console.log('✅ Quantidade atualizada no DOM');
            
            // Atualizar subtotal do item
            const subtotalElement = document.getElementById(`subtotal-${itemId}`);
            if (subtotalElement) {
                subtotalElement.textContent = data.subtotal_item.toFixed(2);
                console.log('✅ Subtotal do item atualizado:', subtotalElement.textContent);
            }
            
            // Atualizar resumo geral
            await atualizarCarrinhoResumo();
            showToast('Quantidade atualizada!', 'success');
        } else {
            console.log('❌ Erro na resposta:', data.error);
            showToast(data.error || 'Erro ao atualizar quantidade', 'error');
        }
        
    } catch (error) {
        console.error('Erro na alteração de quantidade:', error);
        showToast('Erro de conexão', 'error');
    }
}

// Remover item do carrinho
async function removerItem(itemId) {
    console.log(`🗑️ Iniciando remoção do item: ${itemId}`);
    if (!confirm('Tem certeza que deseja remover este item do carrinho?')) {
        console.log('❌ Remoção cancelada pelo usuário');
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
        console.log('Resposta da remoção:', data);
        
        if (data.success) {
            // Remover item do DOM
            const itemElement = document.getElementById(`item-${itemId}`);
            if (itemElement) {
                console.log('✅ Removendo elemento do DOM');
                itemElement.style.opacity = '0';
                setTimeout(() => {
                    itemElement.remove();
                    // Verificar se ainda há itens
                    const remainingItems = document.querySelectorAll('[id^="item-"]');
                    console.log('Itens restantes no carrinho:', remainingItems.length);
                    if (remainingItems.length === 0) {
                        atualizarCarrinhoResumo();
                    }
                }, 300);
            }
            
            showToast('Item removido do carrinho', 'success');
        } else {
            console.log('❌ Erro na remoção:', data.error);
            showToast(data.error || 'Erro ao remover item', 'error');
        }
        
    } catch (error) {
        console.error('Erro na remoção:', error);
        showToast('Erro de conexão', 'error');
    }
}

// ===== NOVA VERSÃO DA FUNÇÃO CRIAR PEDIDO COM PIX SIMULADO =====
async function criarPedido() {
    const finalizarBtn = document.getElementById('finalizar-compra');
    
    try {
        // Mostrar loading
        const originalText = finalizarBtn.innerHTML;
        finalizarBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
        finalizarBtn.disabled = true;

        // Endereço fixo por enquanto
        const enderecoEntrega = {
            rua: "Rua do Cliente",
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
            },
            body: JSON.stringify({
                metodo_pagamento: "pix",
                endereco_entrega: enderecoEntrega
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('✅ Pedido criado com sucesso!', 'success');
            
            // ✅ SEMPRE mostra modal PIX (agora simulado)
            if (data.pagamento) {
                console.log('🎭 Pagamento simulado:', data.pagamento);
                mostrarQRCodePIX(data.pagamento);
            } else {
                // Se não tem pagamento, redireciona
                window.location.href = '/meus-pedidos/';
            }
            
        } else {
            showToast('❌ Erro: ' + (data.error || 'Erro ao criar pedido'), 'error');
        }
        
    } catch (error) {
        console.error('Erro:', error);
        showToast('⚠️ Erro de conexão ao finalizar compra', 'error');
    } finally {
        // Restaurar botão
        if (finalizarBtn) {
            finalizarBtn.innerHTML = 'Finalizar Compra';
            finalizarBtn.disabled = false;
        }
    }
}

// ===== NOVA VERSÃO DA FUNÇÃO MOSTRAR QR CODE PIX (SIMULADO) =====
function mostrarQRCodePIX(pagamento) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">
                    Pagamento PIX ${pagamento.simulado ? '(Modo Simulação)' : ''}
                </h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="text-center">
                <p class="text-gray-600 mb-4">Escaneie o QR Code ou copie o código PIX</p>
                
                <div class="bg-gray-100 p-4 rounded-lg mb-4">
                    <!-- QR Code Simulado -->
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-qrcode text-6xl text-blue-500 mb-4"></i>
                        <p class="font-bold text-lg">PIX SIMULADO</p>
                        <p class="text-sm mt-2">Para testes de desenvolvimento</p>
                    </div>
                </div>
                
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div class="flex items-center">
                        <i class="fas fa-info-circle text-yellow-500 mr-2"></i>
                        <p class="text-yellow-700 text-sm">
                            <strong>Modo Desenvolvimento:</strong> Este é um pagamento simulado.
                        </p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <button onclick="copiarPIX('${pagamento.codigo_pagamento}')" 
                            class="w-full bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 font-medium">
                        <i class="fas fa-copy mr-2"></i>Copiar Código PIX
                    </button>
                    
                    <button onclick="simularPagamentoAprovado('${pagamento.id_transacao}')" 
                            class="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 font-medium">
                        <i class="fas fa-check mr-2"></i>Simular Pagamento Aprovado
                    </button>
                    
                    <button onclick="this.closest('.fixed').remove(); window.location.href = '/meus-pedidos/';" 
                            class="w-full bg-gray-500 text-white px-4 py-3 rounded hover:bg-gray-600 font-medium">
                        <i class="fas fa-shopping-bag mr-2"></i>Ver Meus Pedidos
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ===== NOVA FUNÇÃO PARA SIMULAR PAGAMENTO APROVADO =====
function simularPagamentoAprovado(transactionId) {
    console.log('🎭 Simulando pagamento aprovado:', transactionId);
    
    // Simula webhook de pagamento aprovado
    fetch('/pagamento/abacatepay/webhook/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            id: transactionId,
            status: "aprovado",
            dev_mode: true,
            simulado: true
        })
    })
    .then(response => response.json())
    .then(data => {
        showToast('✅ Pagamento simulado aprovado!', 'success');
        
        // Fecha modal e redireciona após 2 segundos
        setTimeout(() => {
            const modal = document.querySelector('.fixed');
            if (modal) modal.remove();
            window.location.href = '/meus-pedidos/';
        }, 2000);
    })
    .catch(error => {
        console.error('Erro na simulação:', error);
        showToast('⚠️ Erro na simulação', 'error');
    });
}

function copiarPIX(codigo) {
    console.log('📋 Copiando código PIX para clipboard');
    navigator.clipboard.writeText(codigo).then(() => {
        console.log('✅ Código PIX copiado com sucesso');
        showToast('Código PIX copiado!', 'success');
    }).catch(err => {
        console.error('❌ Erro ao copiar código PIX:', err);
        showToast('Erro ao copiar código', 'error');
    });
}

// ===== EXPORTAR FUNÇÕES ESPECÍFICAS =====
window.alterarQuantidade = alterarQuantidade;
window.removerItem = removerItem;
window.criarPedido = criarPedido;
window.mostrarQRCodePIX = mostrarQRCodePIX;
window.copiarPIX = copiarPIX;
window.simularPagamentoAprovado = simularPagamentoAprovado;
window.handleFinalizarCompra = handleFinalizarCompra;
window.inicializarEventListeners = inicializarEventListeners;

console.log('✅ Funções do carrinho disponíveis');
console.log('🎯 carrinho.js totalmente carregado e inicializado');