// core/static/core/admin-front-end/js/admin-vendas.js

// ===== FUNÇÕES PARA GESTÃO DE VENDAS NO ADMIN =====

let currentOrdersPage = 1;
let currentOrdersStatus = '';
let currentOrdersSearch = '';

console.log('🚀 admin-vendas.js CARREGADO - Iniciando setup...');

// Função principal de inicialização
function setupVendasSection() {
    console.log('🔧 Iniciando setup da seção de vendas...');
    
    const vendasSection = document.getElementById('vendas-section');
    if (!vendasSection) {
        console.log('❌ Seção de vendas não encontrada, tentando novamente...');
        setTimeout(setupVendasSection, 100);
        return;
    }
    
    console.log('✅ Seção de vendas encontrada');
    
    initializeFilters();
    initializePagination();
    initializeVendasButtons();
    
    console.log('🎉 Setup da seção de vendas COMPLETO!');
}

// Inicialização imediata + DOMContentLoaded
setTimeout(setupVendasSection, 50);
document.addEventListener('DOMContentLoaded', setupVendasSection);

// ====================
// FILTROS E PAGINAÇÃO COM AJAX
// ====================

async function goToOrdersPage(page) {
    console.log('📄 Carregando página:', page);
    
    try {
        currentOrdersPage = page;
        
        // Mostrar loading
        showTableLoading();
        
        // Construir URL
        const params = new URLSearchParams({
            page: page,
            status: currentOrdersStatus,
            search: currentOrdersSearch,
            section: 'vendas'
        });
        
        const url = `/admin-panel/?${params}`;
        console.log('🔗 URL:', url);
        
        // Fazer requisição
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const html = await response.text();
        await processAjaxResponse(html);
        
        console.log('✅ Página carregada com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao carregar página:', error);
        showTableError('Erro ao carregar pedidos. Tente novamente.');
    }
}

function processAjaxResponse(html) {
    return new Promise((resolve, reject) => {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            const newVendasSection = tempDiv.querySelector('#vendas-section');
            if (!newVendasSection) {
                throw new Error('Seção de vendas não encontrada na resposta');
            }
            
            const currentVendasSection = document.getElementById('vendas-section');
            if (!currentVendasSection) {
                throw new Error('Seção de vendas atual não encontrada');
            }
            
            // IMPORTANTE: Substituir APENAS o conteúdo interno, mantendo a seção
            const newContent = newVendasSection.innerHTML;
            currentVendasSection.innerHTML = newContent;
            
            // Re-inicializar tudo
            initializeFilters();
            initializePagination();
            initializeVendasButtons();
            
            // Restaurar valores dos filtros
            restoreFilterValues();
            
            resolve();
            
        } catch (error) {
            reject(error);
        }
    });
}

function handleOrdersFilter() {
    console.log('🎯 Aplicando filtros...');
    
    try {
        const statusSelect = document.querySelector('#vendas-section select[name="status"]');
        const searchInput = document.querySelector('#vendas-section input[name="search"]');
        
        currentOrdersStatus = statusSelect?.value || '';
        currentOrdersSearch = searchInput?.value || '';
        currentOrdersPage = 1;
        
        console.log('📊 Filtros - Status:', currentOrdersStatus, 'Busca:', currentOrdersSearch);
        
        goToOrdersPage(1);
        
    } catch (error) {
        console.error('❌ Erro nos filtros:', error);
        alert('Erro ao aplicar filtros.');
    }
}

function restoreFilterValues() {
    try {
        // Restaurar select de status
        const statusSelect = document.querySelector('#vendas-section select[name="status"]');
        if (statusSelect && currentOrdersStatus) {
            statusSelect.value = currentOrdersStatus;
        }
        
        // Restaurar input de busca
        const searchInput = document.querySelector('#vendas-section input[name="search"]');
        if (searchInput && currentOrdersSearch) {
            searchInput.value = currentOrdersSearch;
        }
        
    } catch (error) {
        console.error('❌ Erro ao restaurar filtros:', error);
    }
}

// ====================
// INICIALIZAÇÃO DOS COMPONENTES
// ====================

function initializeFilters() {
    try {
        // Configurar select de status
        const statusSelect = document.querySelector('#vendas-section select[name="status"]');
        if (statusSelect) {
            statusSelect.addEventListener('change', handleOrdersFilter);
        }
        
        // Configurar input de busca
        const searchInput = document.querySelector('#vendas-section input[name="search"]');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    handleOrdersFilter();
                }, 500);
            });
            
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOrdersFilter();
                }
            });
        }
        
        // Configurar botão filtrar
        const filterButton = document.querySelector('#vendas-section button[type="button"]');
        if (filterButton) {
            filterButton.addEventListener('click', handleOrdersFilter);
        }
        
    } catch (error) {
        console.error('❌ Erro na inicialização dos filtros:', error);
    }
}

function initializePagination() {
    try {
        document.querySelectorAll('#vendas-section .pagination-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                if (page) {
                    goToOrdersPage(parseInt(page));
                }
            });
        });
    } catch (error) {
        console.error('❌ Erro na paginação:', error);
    }
}

function initializeVendasButtons() {
    try {
        console.log('🔧 Inicializando botões da seção vendas...');
        
        // Botões Ver Pedido
        document.querySelectorAll('.btn-ver-pedido').forEach(button => {
            button.addEventListener('click', function() {
                const pedidoId = this.getAttribute('data-pedido-id');
                console.log('👁️ Clicou em ver pedido:', pedidoId);
                verDetalhesPedido(pedidoId);
            });
        });
        
        // Botões Editar Status
        document.querySelectorAll('.btn-editar-status').forEach(button => {
            button.addEventListener('click', function() {
                const pedidoId = this.getAttribute('data-pedido-id');
                console.log('✏️ Clicou em editar status:', pedidoId);
                editarStatusPedido(pedidoId);
            });
        });
        
        console.log('✅ Botões inicializados:', {
            ver: document.querySelectorAll('.btn-ver-pedido').length,
            editar: document.querySelectorAll('.btn-editar-status').length
        });
        
    } catch (error) {
        console.error('❌ Erro nos botões:', error);
    }
}

// ====================
// UI/UX FUNCTIONS
// ====================

function showTableLoading() {
    const tableBody = document.querySelector('#vendas-section table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    <div class="flex justify-center items-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                        Carregando pedidos...
                    </div>
                </td>
            </tr>
        `;
    }
}

function showTableError(message) {
    const tableBody = document.querySelector('#vendas-section table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-red-600">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    ${message}
                </td>
            </tr>
        `;
    }
}

// ====================
// GESTÃO DE PEDIDOS
// ====================

async function verDetalhesPedido(pedidoId) {
    console.log(`📦 Visualizando pedido: ${pedidoId}`);
    
    try {
        mostrarLoading();
        
        const response = await fetch(`/api/admin/pedidos/${pedidoId}/detalhes/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        esconderLoading();
        
        if (data.success) {
            // CORREÇÃO: Garantir que os valores numéricos sejam números
            const pedidoCorrigido = {
                ...data.pedido,
                total_produtos: parseFloat(data.pedido.total_produtos) || 0,
                total_frete: parseFloat(data.pedido.total_frete) || 0,
                total_descontos: parseFloat(data.pedido.total_descontos) || 0,
                total_final: parseFloat(data.pedido.total_final) || 0,
                itens: data.pedido.itens ? data.pedido.itens.map(item => ({
                    ...item,
                    subtotal: parseFloat(item.subtotal) || 0,
                    quantidade: parseInt(item.quantidade) || 0
                })) : []
            };
            
            mostrarModalDetalhesPedido(pedidoCorrigido);
        } else {
            throw new Error(data.error || 'Erro ao carregar detalhes');
        }
        
    } catch (error) {
        esconderLoading();
        console.error('Erro detalhes pedido:', error);
        mostrarToast(`Erro: ${error.message}`, 'error');
    }
}

function editarStatusPedido(pedidoId) {
    const opcoesStatus = [
        { valor: 'Pendente', texto: '🟡 Pendente' },
        { valor: 'Processando', texto: '🟠 Processando' },
        { valor: 'Enviado', texto: '🔵 Enviado' },
        { valor: 'Entregue', texto: '🟢 Entregue' },
        { valor: 'Cancelado', texto: '🔴 Cancelado' }
    ];
    
    const opcoesTexto = opcoesStatus.map(op => op.texto).join('\n');
    const novoStatus = prompt(`Alterar status do pedido ${pedidoId}:\n\n${opcoesTexto}`);
    
    if (novoStatus) {
        const statusSelecionado = opcoesStatus.find(op => 
            op.texto.includes(novoStatus) || op.valor === novoStatus
        );
        
        if (statusSelecionado) {
            console.log(`🔄 Alterando pedido ${pedidoId} para status: ${statusSelecionado.valor}`);
            atualizarStatusPedido(pedidoId, statusSelecionado.valor);
        } else {
            mostrarToast('Status inválido. Use: Pendente, Processando, Enviado, Entregue ou Cancelado', 'error');
        }
    }
}

async function atualizarStatusPedido(pedidoId, novoStatus) {
    try {
        mostrarLoading();
        
        console.log(`🔄 Atualizando pedido ${pedidoId} para status: ${novoStatus}`);
        
        const response = await fetch(`/api/admin/pedidos/${pedidoId}/status/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ status: novoStatus })
        });
        
        const data = await response.json();
        esconderLoading();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        if (data.success) {
            mostrarToast(`✅ Status atualizado para: ${novoStatus}`, 'success');
            // Recarregar a página atual após 1 segundo
            setTimeout(() => {
                console.log('🔄 Recarregando tabela após atualização...');
                goToOrdersPage(currentOrdersPage);
            }, 1000);
        } else {
            throw new Error(data.error || 'Erro ao atualizar status');
        }
        
    } catch (error) {
        esconderLoading();
        console.error('❌ Erro atualizar status:', error);
        mostrarToast(`❌ Erro: ${error.message}`, 'error');
    }
}

// ====================
// MODAL E FUNÇÕES AUXILIARES
// ====================

function mostrarModalDetalhesPedido(pedido) {
    console.log('📊 Dados do pedido para modal:', pedido);
    
    // FUNÇÃO AUXILIAR SEGURA PARA FORMATAÇÃO DE NÚMEROS
    function formatarNumero(valor) {
        if (valor === null || valor === undefined) return '0.00';
        // Converter para número primeiro
        const num = typeof valor === 'string' ? parseFloat(valor) : Number(valor);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    }
    
    // CORREÇÃO: Garantir que os valores sejam números
    const itensFormatados = pedido.itens ? pedido.itens.map(item => ({
        ...item,
        subtotal: formatarNumero(item.subtotal),
        quantidade: item.quantidade || 0
    })) : [];
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Detalhes do Pedido #${pedido.numero_pedido}</h3>
                    <button onclick="fecharModal()" class="text-gray-500 hover:text-gray-700 text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Informações do Cliente</h4>
                        <p><strong>Nome:</strong> ${pedido.cliente_nome || 'N/A'}</p>
                        <p><strong>Email:</strong> ${pedido.cliente_email || 'N/A'}</p>
                        <p><strong>Telefone:</strong> ${pedido.cliente_telefone || 'N/A'}</p>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Endereço de Entrega</h4>
                        <p class="text-sm">${pedido.endereco_entrega ? formatarEndereco(pedido.endereco_entrega) : 'N/A'}</p>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-gray-700 mb-2">Itens do Pedido</h4>
                    <div class="border border-gray-200 rounded-lg">
                        ${itensFormatados.length > 0 ? 
                            itensFormatados.map(item => `
                                <div class="flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0">
                                    <div>
                                        <p class="font-medium">${item.produto_nome || 'Produto não encontrado'}</p>
                                        <p class="text-sm text-gray-600">Quantidade: ${item.quantidade}</p>
                                    </div>
                                    <p class="font-medium">R$ ${item.subtotal}</p>
                                </div>
                            `).join('') : 
                            '<p class="p-3 text-gray-500 text-center">Nenhum item encontrado</p>'
                        }
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Resumo Financeiro</h4>
                        <div class="space-y-2 bg-gray-50 p-4 rounded-lg">
                            <div class="flex justify-between">
                                <span>Subtotal:</span>
                                <span class="font-medium">R$ ${formatarNumero(pedido.total_produtos)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Frete:</span>
                                <span class="font-medium">R$ ${formatarNumero(pedido.total_frete)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Descontos:</span>
                                <span class="font-medium">R$ ${formatarNumero(pedido.total_descontos)}</span>
                            </div>
                            <div class="flex justify-between border-t border-gray-300 pt-2 mt-2">
                                <span class="font-bold">Total:</span>
                                <span class="font-bold text-lg">R$ ${formatarNumero(pedido.total_final)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Status</h4>
                        <div class="space-y-3 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <span class="block text-sm text-gray-600 mb-1">Pedido:</span>
                                <span class="px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(pedido.status)}">
                                    ${pedido.status || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span class="block text-sm text-gray-600 mb-1">Pagamento:</span>
                                <span class="px-3 py-1 rounded-full text-sm font-semibold ${getStatusPagamentoColor(pedido.status_pagamento)}">
                                    ${pedido.status_pagamento || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span class="block text-sm text-gray-600 mb-1">Data:</span>
                                <span class="text-sm">${pedido.criado_em ? new Date(pedido.criado_em).toLocaleString('pt-BR') : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-end space-x-3">
                    <button onclick="fecharModal()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200">
                        Fechar
                    </button>
                    <button onclick="editarStatusPedido(${pedido.id})" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition duration-200">
                        <i class="fas fa-edit mr-2"></i>Alterar Status
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharModal() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) modal.remove();
}

function formatarEndereco(endereco) {
    if (typeof endereco === 'string') {
        try {
            endereco = JSON.parse(endereco);
        } catch (e) {
            return endereco;
        }
    }
    
    if (typeof endereco === 'object') {
        return `${endereco.rua || ''}, ${endereco.numero || ''} - ${endereco.bairro || ''}, ${endereco.cidade || ''} - ${endereco.estado || ''}, ${endereco.cep || ''}`;
    }
    
    return 'Endereço não disponível';
}

function getStatusColor(status) {
    const cores = {
        'Entregue': 'bg-green-100 text-green-800',
        'Processando': 'bg-yellow-100 text-yellow-800',
        'Enviado': 'bg-blue-100 text-blue-800',
        'Pendente': 'bg-orange-100 text-orange-800',
        'Cancelado': 'bg-red-100 text-red-800'
    };
    return cores[status] || 'bg-gray-100 text-gray-800';
}

function getStatusPagamentoColor(status) {
    const cores = {
        'aprovado': 'bg-green-100 text-green-800',
        'pendente': 'bg-yellow-100 text-yellow-800',
        'recusado': 'bg-red-100 text-red-800',
        'processando': 'bg-blue-100 text-blue-800'
    };
    return cores[status] || 'bg-gray-100 text-gray-800';
}

function mostrarLoading() {
    console.log('🔄 Carregando...');
}

function esconderLoading() {
    console.log('✅ Carregamento completo');
}

function mostrarToast(mensagem, tipo = 'info') {
    alert(mensagem);
}

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

// Exportar funções globais
window.verDetalhesPedido = verDetalhesPedido;
window.editarStatusPedido = editarStatusPedido;
window.fecharModal = fecharModal;
window.goToOrdersPage = goToOrdersPage;
window.handleOrdersFilter = handleOrdersFilter;