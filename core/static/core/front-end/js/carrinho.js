// core/static/core/front-end/js/carrinho.js

// ===== FUNÇÃO CSRF TOKEN (CRÍTICO PARA POSTS) =====
function getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('csrftoken' + '=')) {
                cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

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

// ===== INICIALIZAR EVENT LISTENERS COM DEBUG COMPLETO =====
function inicializarEventListeners() {
    console.log('🔄 Inicializando event listeners...');
    
    // 🔍 DEBUG COMPLETO DOS ELEMENTOS
    console.log('🔍 DEBUG - Elementos importantes:');
    console.log('- Botão finalizar:', document.getElementById('finalizar-compra'));
    console.log('- Botão calcular frete:', document.getElementById('btn-calcular-frete'));
    console.log('- Input CEP:', document.getElementById('cep-destino'));
    console.log('- Resultado frete:', document.getElementById('resultado-frete'));
    console.log('- Resumo frete:', document.getElementById('resumo-frete'));
    console.log('- Resumo subtotal:', document.getElementById('resumo-subtotal'));
    console.log('- Resumo total:', document.getElementById('resumo-total'));
    
    // Botão finalizar compra
    const finalizarBtn = document.getElementById('finalizar-compra');
    if (finalizarBtn) {
        finalizarBtn.addEventListener('click', handleFinalizarCompra);
        console.log('✅ Event listener adicionado ao botão finalizar');
    } else {
        console.log('❌ Botão finalizar-compra não encontrado!');
    }

    // 🔍 DEBUG DETALHADO DO BOTÃO CALCULAR FRETE
    console.log('🎯 DEBUG - Procurando botão calcular frete...');
    const calcularFreteBtn = document.getElementById('btn-calcular-frete');
    console.log('Botão calcular frete encontrado:', calcularFreteBtn);

    if (calcularFreteBtn) {
        console.log('✅ Botão calcular frete EXISTE no DOM');
        
        calcularFreteBtn.addEventListener('click', function(e) {
            console.log('🎯🎯🎯 CLIQUE NO BOTÃO CALCULAR FRETE DETECTADO!');
            console.log('Event:', e);
            console.log('Botão clicado:', this);
            simularFreteCarrinho();
        });
        
        console.log('✅ Event listener adicionado ao botão calcular frete');
        
        // NOVO: Adiciona a máscara/formatação para o campo CEP
        const inputCep = document.getElementById('cep-destino');
        if (inputCep) {
            console.log('✅ Input CEP encontrado, adicionando máscara...');
            inputCep.addEventListener('input', (e) => {
                console.log('📝 Input CEP alterado:', e.target.value);
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 5) {
                    value = value.substring(0, 5) + '-' + value.substring(5, 8);
                }
                e.target.value = value;
                console.log('📝 CEP formatado:', e.target.value);
            });
            
            // Teste: adicionar CEP de exemplo para facilitar testes
            if (!inputCep.value) {
                inputCep.value = '01001-000';
                console.log('📝 CEP de exemplo preenchido: 01001-000');
            }
        } else {
            console.log('❌ Input CEP não encontrado!');
        }
    } else {
        console.log('❌❌❌ BOTÃO CALCULAR FRETE NÃO ENCONTRADO!');
        console.log('🔍 Procurando todos os botões na página:');
        document.querySelectorAll('button').forEach(btn => {
            console.log(`- Botão: ${btn.textContent}`, btn);
        });
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

// ===== FUNÇÃO DE CÁLCULO DE FRETE COM DEBUG COMPLETO =====
async function simularFreteCarrinho() {
    console.log('🚚 INICIANDO CÁLCULO DE FRETE...');
    
    const inputCep = document.getElementById('cep-destino');
    const resultadoDiv = document.getElementById('resultado-frete');
    const resumoFreteSpan = document.getElementById('resumo-frete');
    
    console.log('📦 Elementos encontrados:');
    console.log('- Input CEP:', inputCep);
    console.log('- Resultado div:', resultadoDiv);
    console.log('- Resumo frete span:', resumoFreteSpan);
    
    if (!inputCep) {
        console.log('❌ Input CEP não encontrado!');
        return;
    }
    
    // Formatação e validação
    const cepDestino = inputCep.value.replace(/\D/g, '');
    console.log('📍 CEP processado:', cepDestino);

    if (cepDestino.length !== 8) {
        console.log('❌ CEP inválido:', cepDestino);
        resultadoDiv.innerHTML = '<p class="text-red-500">CEP inválido. Digite 8 dígitos.</p>';
        return;
    }

    console.log('✅ CEP válido, iniciando cálculo...');

    // Indica que o cálculo está em andamento
    resultadoDiv.innerHTML = '<p class="text-blue-500"><i class="fas fa-spinner fa-spin mr-2"></i> Calculando...</p>';
    resumoFreteSpan.textContent = 'R$ Calculando...';

    try {
        console.log('📤 Enviando requisição para /api/carrinho/simular-frete/');
        console.log('📦 Dados enviados:', { cep_destino: cepDestino });
        console.log('🔐 CSRF Token:', getCSRFToken() ? 'PRESENTE' : 'AUSENTE');

        const response = await fetch('/api/carrinho/simular-frete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ cep_destino: cepDestino })
        });

        console.log('📥 Resposta recebida:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('📊 Dados da resposta:', data);

        if (data.success) {
            const frete = parseFloat(data.frete);
            console.log('✅ Frete calculado com sucesso:', frete);
            
            // 1. Atualiza o frete no resumo
            resumoFreteSpan.textContent = `R$ ${frete.toFixed(2).replace('.', ',')}`;

            // 2. Armazena o valor do frete em localStorage
            localStorage.setItem('frete_valor', frete.toFixed(2));
            localStorage.setItem('frete_servico', data.servico);
            localStorage.setItem('frete_prazo', data.prazo_dias);

            console.log('💾 Frete salvo no localStorage:', {
                valor: frete,
                servico: data.servico,
                prazo: data.prazo_dias
            });

            // 3. Atualiza o bloco de detalhes (prazo e modalidade)
            resultadoDiv.innerHTML = `
                <p class="text-green-600 font-medium">✓ Frete calculado com sucesso!</p>
                <p>Serviço: <strong class="text-gray-800">${data.servico}</strong></p>
                <p>Prazo: <strong class="text-gray-800">${data.prazo_dias} dias úteis</strong></p>
                <p class="text-sm text-gray-500">Valor: R$ ${frete.toFixed(2).replace('.', ',')}</p>
            `;
            
            // 4. Atualiza o total final no resumo
            await atualizarCarrinhoResumo();
            showToast('Frete calculado com sucesso!', 'success');

        } else {
            console.log('❌ Erro no cálculo do frete:', data.error);
            resultadoDiv.innerHTML = `<p class="text-red-500">❌ Erro: ${data.error}</p>`;
            resumoFreteSpan.textContent = 'R$ 0,00';
            localStorage.removeItem('frete_valor'); // Limpa frete em caso de erro
            await atualizarCarrinhoResumo();
        }
    } catch (error) {
        console.error('❌ Erro na simulação de frete:', error);
        resultadoDiv.innerHTML = `<p class="text-red-500">❌ Erro de comunicação. Tente novamente.</p>`;
        resumoFreteSpan.textContent = 'R$ 0,00';
        localStorage.removeItem('frete_valor');
        await atualizarCarrinhoResumo();
    }
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

// ===== FUNÇÃO CRIAR PEDIDO CORRIGIDA COM DEBUG =====
async function criarPedido() {
    console.log('📦 INICIANDO CRIAÇÃO DE PEDIDO...');
    const finalizarBtn = document.getElementById('finalizar-compra');
    
    try {
        // Mostrar loading
        const originalText = finalizarBtn.innerHTML;
        finalizarBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
        finalizarBtn.disabled = true;

        // 🔥 CORREÇÃO: Obter CPF do usuário
        let cpfDestinatario = await obterCPFUsuario();
        console.log('📝 CPF obtido:', cpfDestinatario);
        
        if (!cpfDestinatario) {
            showToast('CPF é obrigatório para envio', 'error');
            finalizarBtn.innerHTML = originalText;
            finalizarBtn.disabled = false;
            return;
        }

        // Endereço fixo por enquanto (deveria vir de um formulário)
        const enderecoEntrega = {
            rua: "Rua do Cliente",
            numero: "123", 
            bairro: "Centro",
            cidade: "São Paulo",
            estado: "SP",
            cep: "01000-000",
            nome_completo: "Cliente Teste" // 🔥 ADICIONAR NOME
        };

        console.log('📦 Dados do pedido a serem enviados:', {
            metodo_pagamento: "pix",
            endereco_entrega: enderecoEntrega,
            cpf_destinatario: cpfDestinatario
        });

        const response = await fetch('/api/pedido/criar/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                metodo_pagamento: "pix",
                endereco_entrega: enderecoEntrega,
                cpf_destinatario: cpfDestinatario // 🔥 ENVIAR CPF CORRETAMENTE
            })
        });
        
        const data = await response.json();
        console.log('📨 Resposta da API:', data);
        
        if (response.ok) {
            showToast('✅ Pedido criado com sucesso!', 'success');
            
            if (data.pagamento) {
                console.log('🎭 Pagamento simulado:', data.pagamento);
                mostrarQRCodePIX(data.pagamento);
            } else {
                window.location.href = '/meus-pedidos/';
            }
            
        } else {
            console.error('❌ Erro na criação do pedido:', data);
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

// ===== FUNÇÃO PARA OBTER CPF DO USUÁRIO =====
async function obterCPFUsuario() {
    console.log('🔍 Buscando CPF do usuário...');
    
    // Tentar obter do perfil do usuário primeiro
    try {
        const response = await fetch('/api/perfil/');
        if (response.ok) {
            const perfil = await response.json();
            console.log('📋 Perfil do usuário:', perfil);
            if (perfil.cpf) {
                console.log('✅ CPF encontrado no perfil:', perfil.cpf);
                return perfil.cpf;
            }
        }
    } catch (error) {
        console.log('ℹ️ Não foi possível obter CPF do perfil:', error);
    }
    
    // Se não tem CPF, pedir ao usuário
    console.log('🔄 Solicitando CPF do usuário...');
    return new Promise((resolve) => {
        const cpf = prompt('Por favor, informe seu CPF para envio (apenas números):');
        console.log('📝 CPF informado pelo usuário:', cpf);
        if (cpf && cpf.replace(/\D/g, '').length === 11) {
            resolve(cpf.replace(/\D/g, ''));
        } else if (cpf) {
            alert('CPF inválido! Deve conter 11 dígitos.');
            resolve(null);
        } else {
            resolve(null);
        }
    });
}

// ===== FUNÇÕES ESPECÍFICAS DO CARRINHO (AJUSTADA) =====

// Função para atualizar o resumo, agora considerando o frete do localStorage
async function atualizarCarrinhoResumo() {
    console.log('🔄 Atualizando resumo do carrinho...');
    try {
        const response = await fetch('/carrinho-json/');
        if (!response.ok) throw new Error('Erro ao carregar carrinho');
        
        const data = await response.json();
        console.log('Dados do carrinho recebidos:', data);
        
        // NOVO: Obter frete do localStorage (se foi calculado)
        const freteCalculado = parseFloat(localStorage.getItem('frete_valor')) || 0;
        console.log('🚚 Frete do localStorage:', freteCalculado);
        
        const subtotal = data.subtotal;
        const totalComFrete = subtotal + freteCalculado;

        console.log('💰 Cálculos:');
        console.log('- Subtotal:', subtotal);
        console.log('- Frete:', freteCalculado);
        console.log('- Total com frete:', totalComFrete);

        // Atualizar resumo
        const subtotalElement = document.getElementById('resumo-subtotal');
        const freteElement = document.getElementById('resumo-frete');
        const totalElement = document.getElementById('resumo-total');
        
        if (subtotalElement) {
            subtotalElement.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
            console.log('✅ Subtotal atualizado');
        }
        
        // Garantir que o campo frete seja atualizado se houver valor
        if (freteElement) {
             freteElement.textContent = `R$ ${freteCalculado.toFixed(2).replace('.', ',')}`;
             console.log('✅ Frete atualizado');
        }

        if (totalElement) {
            totalElement.textContent = `R$ ${totalComFrete.toFixed(2).replace('.', ',')}`;
            console.log('✅ Total atualizado');
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

// ===== CORREÇÃO DE EMERGÊNCIA =====
// Se o botão ainda não funcionar após 2 segundos, força a vinculação
setTimeout(() => {
    console.log('🔄 CORREÇÃO DE EMERGÊNCIA - Re-vinculando eventos...');
    
    const btnCalcular = document.getElementById('btn-calcular-frete');
    if (btnCalcular) {
        console.log('🎯 EMERGÊNCIA: Vinculando evento ao botão calcular frete');
        btnCalcular.onclick = simularFreteCarrinho;
    } else {
        console.log('❌ EMERGÊNCIA: Botão calcular frete ainda não encontrado');
    }
    
    const inputCep = document.getElementById('cep-destino');
    if (inputCep && !inputCep.value) {
        inputCep.value = '01001-000'; // CEP de exemplo para teste
        console.log('📝 EMERGÊNCIA: CEP de exemplo preenchido');
    }
}, 2000);

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

// ===== FUNÇÕES AUXILIARES (EXISTENTES) =====
async function checkUserAuthentication() {
    try {
        const response = await fetch('/api/auth/check/');
        const data = await response.json();
        return data.authenticated;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return false;
    }
}

function showLoginModal() {
    // Implementar modal de login ou redirecionar
    window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
}

function showToast(message, type = 'info') {
    // Implementar toast notifications
    alert(`${type.toUpperCase()}: ${message}`);
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
window.simularFreteCarrinho = simularFreteCarrinho;
window.obterCPFUsuario = obterCPFUsuario;

console.log('✅ Funções do carrinho disponíveis');
console.log('🎯 carrinho.js totalmente carregado e inicializado');