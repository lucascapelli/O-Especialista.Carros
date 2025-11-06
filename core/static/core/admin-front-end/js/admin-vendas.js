// core/static/core/admin-front-end/js/admin-vendas.js

// ===== FUNÇÕES PARA GESTÃO DE VENDAS NO ADMIN =====

// Event listeners para os botões da tabela de pedidos
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ admin-vendas.js carregado');
    
    // Botões Ver Pedido
    document.querySelectorAll('.btn-ver-pedido').forEach(button => {
        button.addEventListener('click', function() {
            const pedidoId = this.getAttribute('data-pedido-id');
            verDetalhesPedido(pedidoId);
        });
    });
    
    // Botões Editar Status
    document.querySelectorAll('.btn-editar-status').forEach(button => {
        button.addEventListener('click', function() {
            const pedidoId = this.getAttribute('data-pedido-id');
            editarStatusPedido(pedidoId);
        });
    });
    
    // Filtros automáticos
    inicializarFiltros();
});

// Função para ver detalhes do pedido
function verDetalhesPedido(pedidoId) {
    console.log(`📦 Visualizando pedido: ${pedidoId}`);
    
    // Mostrar loading
    mostrarLoading();
    
    // Buscar detalhes do pedido via API
    fetch(`/api/pedidos/${pedidoId}/detalhes/`)
        .then(response => response.json())
        .then(data => {
            esconderLoading();
            if (data.success) {
                mostrarModalDetalhesPedido(data.pedido);
            } else {
                alert('Erro ao carregar detalhes do pedido: ' + data.error);
            }
        })
        .catch(error => {
            esconderLoading();
            console.error('Erro:', error);
            // Fallback: mostrar alerta básico
            alert(`Visualizar detalhes do pedido ${pedidoId}\n\n(API não disponível - em desenvolvimento)`);
        });
}

// Função para editar status do pedido
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
        // Encontrar o valor correspondente ao texto selecionado
        const statusSelecionado = opcoesStatus.find(op => 
            op.texto.includes(novoStatus) || op.valor === novoStatus
        );
        
        if (statusSelecionado) {
            atualizarStatusPedido(pedidoId, statusSelecionado.valor);
        } else {
            alert('Status inválido. Use uma das opções listadas.');
        }
    }
}

// Função para atualizar status via API
function atualizarStatusPedido(pedidoId, novoStatus) {
    mostrarLoading();
    
    fetch(`/api/pedidos/${pedidoId}/status/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ status: novoStatus })
    })
    .then(response => response.json())
    .then(data => {
        esconderLoading();
        if (data.success) {
            mostrarToast(`✅ Status atualizado para: ${novoStatus}`, 'success');
            // Recarregar a página após 2 segundos
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            mostrarToast(`❌ Erro: ${data.error}`, 'error');
        }
    })
    .catch(error => {
        esconderLoading();
        console.error('Erro:', error);
        mostrarToast('❌ Erro de conexão ao atualizar status', 'error');
    });
}

// Modal para mostrar detalhes do pedido
function mostrarModalDetalhesPedido(pedido) {
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Detalhes do Pedido #${pedido.numero_pedido}</h3>
                    <button onclick="fecharModal()" class="text-gray-500 hover:text-gray-700">
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
                        <p>${pedido.endereco_entrega ? formatarEndereco(pedido.endereco_entrega) : 'N/A'}</p>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-gray-700 mb-2">Itens do Pedido</h4>
                    <div class="border border-gray-200 rounded-lg">
                        ${pedido.itens ? pedido.itens.map(item => `
                            <div class="flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0">
                                <div>
                                    <p class="font-medium">${item.produto_nome}</p>
                                    <p class="text-sm text-gray-600">Quantidade: ${item.quantidade}</p>
                                </div>
                                <p class="font-medium">R$ ${item.subtotal}</p>
                            </div>
                        `).join('') : '<p class="p-3 text-gray-500">Nenhum item encontrado</p>'}
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Resumo do Pedido</h4>
                        <div class="space-y-2">
                            <p><strong>Subtotal:</strong> R$ ${pedido.total_produtos || '0.00'}</p>
                            <p><strong>Frete:</strong> R$ ${pedido.total_frete || '0.00'}</p>
                            <p><strong>Descontos:</strong> R$ ${pedido.total_descontos || '0.00'}</p>
                            <p class="text-lg font-bold"><strong>Total:</strong> R$ ${pedido.total_final || '0.00'}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-2">Status</h4>
                        <div class="space-y-2">
                            <p><strong>Pedido:</strong> <span class="px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(pedido.status)}">${pedido.status}</span></p>
                            <p><strong>Pagamento:</strong> <span class="px-2 py-1 rounded-full text-xs font-semibold ${getStatusPagamentoColor(pedido.status_pagamento)}">${pedido.status_pagamento || 'N/A'}</span></p>
                            <p><strong>Data:</strong> ${new Date(pedido.criado_em).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-end space-x-3">
                    <button onclick="fecharModal()" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                        Fechar
                    </button>
                    <button onclick="editarStatusPedido(${pedido.id})" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
                        Alterar Status
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Funções auxiliares
function fecharModal() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
        modal.remove();
    }
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
    // Implementar loading se necessário
    console.log('🔄 Carregando...');
}

function esconderLoading() {
    console.log('✅ Carregamento completo');
}

function mostrarToast(mensagem, tipo = 'info') {
    // Toast simples - pode ser melhorado com uma lib
    alert(mensagem);
}

function inicializarFiltros() {
    // Filtros automáticos podem ser adicionados aqui
    console.log('🔍 Filtros inicializados');
}

// Função para obter CSRF token
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

// Exportar funções para uso global
window.verDetalhesPedido = verDetalhesPedido;
window.editarStatusPedido = editarStatusPedido;
window.fecharModal = fecharModal;