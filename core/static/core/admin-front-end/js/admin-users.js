// ====================
// GERENCIAMENTO DE USUÁRIOS COM PAGINAÇÃO AJAX - VERSÃO CORRIGIDA
// ====================

let currentUsersPage = 1;
let currentUsersSearch = '';
let isUsersSectionInitialized = false;
let currentUserModal = null; // ✅ CONTROLE GLOBAL DO MODAL

// ====================
// PAGINAÇÃO E BUSCA COM AJAX
// ====================

async function goToUsersPage(page) {
    console.log('📄 Carregando página:', page);
    
    try {
        currentUsersPage = page;
        
        // Mostrar loading
        const tableBody = document.querySelector('#usuarios-section table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Carregando usuários...</td></tr>';
        }
        
        // Construir URL com parâmetros
        const params = new URLSearchParams({
            page: page,
            search: currentUsersSearch,
            section: 'users'
        });
        
        // Fazer requisição AJAX
        const response = await fetch(`/admin-panel/?${params}`);
        const html = await response.text();
        
        // Criar um elemento temporário para parse do HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Extrair apenas a seção de usuários do HTML retornado
        const newUsersSection = tempDiv.querySelector('#usuarios-section');
        
        if (newUsersSection) {
            // Atualizar apenas a seção de usuários
            const currentUsersSection = document.querySelector('#usuarios-section');
            currentUsersSection.innerHTML = newUsersSection.innerHTML;
            
            // Re-inicializar os event listeners
            initializeUsersEventDelegation();
            
            console.log('✅ Página carregada com sucesso');
        } else {
            console.error('❌ Seção de usuários não encontrada na resposta');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar página:', error);
        showNotification('Erro ao carregar usuários', 'error');
    }
}

async function handleUsersSearch() {
    const searchInput = document.getElementById('search-users-input');
    const search = searchInput?.value || '';
    currentUsersSearch = search;
    currentUsersPage = 1;
    
    await goToUsersPage(1);
}

// ====================
// DELEGAÇÃO DE EVENTOS - CORRIGIDA
// ====================

function initializeUsersEventDelegation() {
    console.log('🎯 Configurando delegação de eventos...');
    
    // Usar delegação de eventos para elementos dinâmicos
    const usersSection = document.getElementById('usuarios-section');
    if (!usersSection) return;
    
    // ✅ REMOVER EVENT LISTENER ANTIGO PRIMEIRO
    usersSection.removeEventListener('click', handleUsersSectionClick);
    
    // ✅ ADICIONAR NOVO EVENT LISTENER
    usersSection.addEventListener('click', handleUsersSectionClick);
    
    // Configurar busca (elemento estático)
    const searchInput = document.getElementById('search-users-input');
    if (searchInput) {
        let searchTimeout;
        
        // Remover event listeners anteriores para evitar duplicação
        searchInput.removeEventListener('input', handleSearchInput);
        searchInput.removeEventListener('keypress', handleSearchEnter);
        
        function handleSearchInput() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleUsersSearch();
            }, 400);
        }
        
        function handleSearchEnter(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleUsersSearch();
            }
        }
        
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keypress', handleSearchEnter);
    }
    
    console.log('✅ Delegação de eventos configurada');
}

// ✅ FUNÇÃO ÚNICA PARA HANDLE CLICK
function handleUsersSectionClick(e) {
    // Paginação
    if (e.target.closest('.pagination-btn')) {
        e.preventDefault();
        const btn = e.target.closest('.pagination-btn');
        const page = btn.getAttribute('data-page');
        if (page && !btn.disabled) {
            goToUsersPage(parseInt(page));
        }
        return;
    }
    
    // APENAS BOTÃO DE VISUALIZAR - REMOVIDOS EDITAR E EXCLUIR
    if (e.target.closest('.view-user')) {
        e.preventDefault();
        const btn = e.target.closest('.view-user');
        const userId = btn.getAttribute('data-user-id');
        viewUserProfile(userId);
        return;
    }
}

// ====================
// FUNÇÕES GLOBAIS
// ====================

function toggleAddUserForm() {
    console.log('📝 Alternando formulário de adicionar usuário');
    const form = document.getElementById('add-user-form');
    if (form) {
        form.classList.toggle('hidden');
    }
}

// Função auxiliar para obter o token CSRF
function getCsrfToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfToken ? csrfToken.value : '';
}

// ====================
// FUNÇÕES AUXILIARES PARA CORES DE STATUS
// ====================

function getStatusColor(status) {
    const colors = {
        'Pendente': 'bg-yellow-100 text-yellow-800',
        'Pago': 'bg-green-100 text-green-800',
        'Cancelado': 'bg-red-100 text-red-800',
        'Entregue': 'bg-blue-100 text-blue-800',
        'Processando': 'bg-purple-100 text-purple-800',
        'Aguardando Pagamento': 'bg-orange-100 text-orange-800',
        'Enviado': 'bg-indigo-100 text-indigo-800',
        'Finalizado': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getPaymentStatusColor(status) {
    const colors = {
        'aprovado': 'bg-green-100 text-green-800',
        'pendente': 'bg-yellow-100 text-yellow-800',
        'recusado': 'bg-red-100 text-red-800',
        'reembolsado': 'bg-blue-100 text-blue-800',
        'cancelado': 'bg-gray-100 text-gray-800',
        'estornado': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// ====================
// SISTEMA DE MODAL - COMPLETAMENTE CORRIGIDO
// ====================

// ✅ FUNÇÃO PARA FECHAR MODAL
function closeUserModal() {
    console.log('🔒 Fechando modal de usuário');
    
    if (currentUserModal) {
        // ✅ REMOVER CORRETAMENTE O MODAL DO DOM
        currentUserModal.remove();
        currentUserModal = null;
        
        // ✅ RESTAURAR O OVERFLOW DO BODY
        document.body.style.overflow = 'auto';
        
        // ✅ REMOVER EVENT LISTENERS GLOBAIS
        document.removeEventListener('keydown', handleModalEscKey);
        document.removeEventListener('click', handleModalBackdropClick);
        
        console.log('✅ Modal fechado com sucesso');
    }
}

// ✅ HANDLERS GLOBAIS PARA O MODAL
function handleModalEscKey(e) {
    if (e.key === 'Escape') {
        closeUserModal();
    }
}

function handleModalBackdropClick(e) {
    if (e.target.classList.contains('user-modal-backdrop')) {
        closeUserModal();
    }
}

// ====================
// MODAL DE PERFIL DO USUÁRIO - COMPLETAMENTE REESCRITO
// ====================

function showUserProfileModal(data) {
    console.log('🎯 Exibindo modal do perfil do usuário:', data.user.id);
    
    // ✅ FECHAR MODAL EXISTENTE ANTES DE ABRIR OUTRO
    if (currentUserModal) {
        closeUserModal();
    }
    
    const riskLevelColors = {
        'low': 'bg-green-100 text-green-800',
        'medium': 'bg-yellow-100 text-yellow-800', 
        'high': 'bg-red-100 text-red-800'
    };

    const riskLevelText = {
        'low': 'Baixo',
        'medium': 'Médio',
        'high': 'Alto'
    };

    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 user-modal-backdrop">
            <div class="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl user-modal-content">
                <!-- Header -->
                <div class="p-6 border-b border-gray-200 bg-white">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-2xl font-bold text-gray-900">Perfil Completo do Usuário</h3>
                            <p class="text-gray-600 mt-1">${data.user.full_name} • ${data.user.email}</p>
                        </div>
                        <button type="button" 
                                class="text-gray-400 hover:text-gray-600 text-2xl transition-colors duration-200 close-modal-btn"
                                onclick="closeUserModal()">
                            &times;
                        </button>
                    </div>
                </div>
                
                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Coluna 1: Informações Básicas -->
                        <div class="lg:col-span-1 space-y-6">
                            <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b border-gray-100 pb-3">
                                    <i class="fas fa-user-circle mr-2 text-blue-500"></i>
                                    Informações Pessoais
                                </h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Nome Completo</label>
                                        <p class="text-gray-800 font-medium">${data.user.full_name}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Email</label>
                                        <p class="text-gray-800 font-medium">${data.user.email}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Telefone</label>
                                        <p class="text-gray-800">${data.user.phone || 'Não informado'}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Status da Conta</label>
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${data.user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${data.user.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Tipo de Usuário</label>
                                        <p class="text-gray-800">
                                            ${data.user.is_staff ? '👑 Administrador' : '👤 Usuário Comum'}
                                            ${data.user.is_superuser ? ' (Superusuário)' : ''}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Status de Suspeita</label>
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${data.user.is_suspicious ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                            ${data.user.is_suspicious ? '🔴 Suspeito' : '✅ Normal'}
                                        </span>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Nível de Risco</label>
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${riskLevelColors[data.user.risk_level] || 'bg-gray-100 text-gray-800'}">
                                            ${riskLevelText[data.user.risk_level] || 'Desconhecido'}
                                        </span>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Data de Cadastro</label>
                                        <p class="text-gray-800">${data.user.date_joined ? new Date(data.user.date_joined).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-1">Último Login</label>
                                        <p class="text-gray-800">${data.user.last_login ? new Date(data.user.last_login).toLocaleDateString('pt-BR') + ' ' + new Date(data.user.last_login).toLocaleTimeString('pt-BR') : 'Nunca'}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Estatísticas -->
                            <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b border-gray-100 pb-3">
                                    <i class="fas fa-chart-bar mr-2 text-green-500"></i>
                                    Estatísticas
                                </h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                                        <div class="text-2xl font-bold text-blue-600">${data.estatisticas.total_pedidos}</div>
                                        <div class="text-sm text-blue-800 font-medium">Total de Pedidos</div>
                                    </div>
                                    <div class="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                                        <div class="text-2xl font-bold text-green-600">R$ ${data.estatisticas.total_gasto.toFixed(2)}</div>
                                        <div class="text-sm text-green-800 font-medium">Total Gasto</div>
                                    </div>
                                    <div class="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                                        <div class="text-2xl font-bold text-purple-600">${data.estatisticas.pedidos_ativos}</div>
                                        <div class="text-sm text-purple-800 font-medium">Pedidos Ativos</div>
                                    </div>
                                    <div class="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                                        <div class="text-2xl font-bold text-yellow-600">R$ ${data.estatisticas.ticket_medio.toFixed(2)}</div>
                                        <div class="text-sm text-yellow-800 font-medium">Ticket Médio</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Controles de Risco -->
                            <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b border-gray-100 pb-3">
                                    <i class="fas fa-shield-alt mr-2 text-red-500"></i>
                                    Controles de Risco
                                </h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-2">Marcar como Suspeito</label>
                                        <button type="button" 
                                                onclick="toggleSuspiciousUser(${data.user.id})" 
                                                class="w-full px-4 py-3 text-sm font-medium ${data.user.is_suspicious ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'} rounded-lg transition-all duration-200 border">
                                            ${data.user.is_suspicious ? '🔴 Remover Suspeita' : '⚠️ Marcar como Suspeito'}
                                        </button>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 block mb-2">Nível de Risco</label>
                                        <div class="flex space-x-2">
                                            <button type="button" 
                                                    onclick="updateUserRiskLevel(${data.user.id}, 'low')" 
                                                    class="flex-1 px-3 py-2 text-xs font-medium ${data.user.risk_level === 'low' ? 'bg-green-600 text-white border-green-600' : 'bg-green-100 text-green-700 border-green-300'} rounded-md transition-all duration-200 border">
                                                Baixo
                                            </button>
                                            <button type="button" 
                                                    onclick="updateUserRiskLevel(${data.user.id}, 'medium')" 
                                                    class="flex-1 px-3 py-2 text-xs font-medium ${data.user.risk_level === 'medium' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-yellow-100 text-yellow-700 border-yellow-300'} rounded-md transition-all duration-200 border">
                                                Médio
                                            </button>
                                            <button type="button" 
                                                    onclick="updateUserRiskLevel(${data.user.id}, 'high')" 
                                                    class="flex-1 px-3 py-2 text-xs font-medium ${data.user.risk_level === 'high' ? 'bg-red-600 text-white border-red-600' : 'bg-red-100 text-red-700 border-red-300'} rounded-md transition-all duration-200 border">
                                                Alto
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Coluna 2: Pedidos e Atividades -->
                        <div class="lg:col-span-2 space-y-6">
                            <!-- Alertas do Sistema -->
                            <div class="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
                                <div class="flex items-center mb-3">
                                    <i class="fas fa-info-circle text-blue-600 text-xl mr-3"></i>
                                    <h4 class="font-semibold text-blue-800 text-lg">Sistema de Gestão de Usuários</h4>
                                </div>
                                <p class="text-blue-700 text-sm">
                                    <strong>Funcionalidades Ativas:</strong> Gestão de Risco, Controle de Contas, Análise de Pedidos e Pagamentos<br>
                                    <strong>ID do Usuário:</strong> ${data.user.id}
                                </p>
                            </div>

                            <!-- Atividades Suspeitas -->
                            ${data.atividades_suspeitas && data.atividades_suspeitas.length > 0 ? `
                            <div class="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-5">
                                <div class="flex items-center mb-3">
                                    <i class="fas fa-exclamation-triangle text-yellow-600 text-xl mr-3"></i>
                                    <h4 class="font-semibold text-yellow-800 text-lg">Alertas de Segurança</h4>
                                </div>
                                <ul class="list-disc list-inside text-yellow-700 space-y-2 text-sm">
                                    ${data.atividades_suspeitas.map(activity => `<li class="font-medium">${activity}</li>`).join('')}
                                </ul>
                            </div>
                            ` : '<div class="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-5"><div class="flex items-center"><i class="fas fa-check-circle text-green-600 text-xl mr-3"></i><h4 class="font-semibold text-green-800 text-lg">Nenhum alerta de segurança detectado</h4></div></div>'}

                            <!-- Últimos Pedidos -->
                            <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b border-gray-100 pb-3">
                                    <i class="fas fa-shopping-bag mr-2 text-purple-500"></i>
                                    Últimos Pedidos
                                </h4>
                                ${data.pedidos && data.pedidos.length > 0 ? `
                                <div class="overflow-x-auto rounded-lg border border-gray-200">
                                    <table class="min-w-full text-sm">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Pedido</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Valor</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody class="bg-white divide-y divide-gray-200">
                                            ${data.pedidos.map(pedido => `
                                            <tr class="hover:bg-gray-50 transition-colors duration-150">
                                                <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">${pedido.numero_pedido || 'N/A'}</td>
                                                <td class="px-4 py-3 whitespace-nowrap">
                                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}">
                                                        ${pedido.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">R$ ${(pedido.total_final || 0).toFixed(2)}</td>
                                                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">${pedido.criado_em ? new Date(pedido.criado_em).toLocaleDateString('pt-BR') : 'N/A'}</td>
                                            </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : '<p class="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-gray-200">Nenhum pedido encontrado.</p>'}
                            </div>

                            <!-- Histórico de Pagamentos -->
                            <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b border-gray-100 pb-3">
                                    <i class="fas fa-credit-card mr-2 text-green-500"></i>
                                    Histórico de Pagamentos
                                </h4>
                                ${data.pagamentos && data.pagamentos.length > 0 ? `
                                <div class="overflow-x-auto rounded-lg border border-gray-200">
                                    <table class="min-w-full text-sm">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Pedido</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Valor</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Método</th>
                                            </tr>
                                        </thead>
                                        <tbody class="bg-white divide-y divide-gray-200">
                                            ${data.pagamentos.map(pagamento => `
                                            <tr class="hover:bg-gray-50 transition-colors duration-150">
                                                <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">${pagamento.pedido_numero || 'N/A'}</td>
                                                <td class="px-4 py-3 whitespace-nowrap">
                                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(pagamento.status)}">
                                                        ${pagamento.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">R$ ${(pagamento.valor || 0).toFixed(2)}</td>
                                                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">${pagamento.metodo || 'N/A'}</td>
                                            </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : '<p class="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-gray-200">Nenhum pagamento encontrado.</p>'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer com Ações -->
                <div class="p-6 border-t border-gray-200 bg-white flex justify-between items-center">
                    <div class="text-sm text-gray-600">
                        ID do usuário: <span class="font-mono bg-gray-100 px-2 py-1 rounded">${data.user.id}</span> • 
                        Risco: <span class="font-medium ${riskLevelColors[data.user.risk_level] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded">${riskLevelText[data.user.risk_level] || 'Desconhecido'}</span>
                    </div>
                    <div class="flex space-x-3">
                        <button type="button" 
                                onclick="toggleUserStatus(${data.user.id})" 
                                class="px-4 py-2 text-sm font-medium ${data.user.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300' : 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300'} rounded-lg transition-all duration-200 border">
                            ${data.user.is_active ? '❌ Desativar Conta' : '✅ Reativar Conta'}
                        </button>
                        <button type="button" 
                                onclick="forceLogoutUser(${data.user.id})" 
                                class="px-4 py-2 text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 rounded-lg transition-all duration-200 border">
                            🚪 Forçar Logout
                        </button>
                        <button type="button" 
                                onclick="sendPasswordReset(${data.user.id})" 
                                class="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300 rounded-lg transition-all duration-200 border">
                            🔑 Enviar Reset
                        </button>
                        <button type="button" 
                                onclick="closeUserModal()" 
                                class="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300 rounded-lg transition-all duration-200 border close-modal-btn">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // ✅ INSERIR MODAL NO BODY
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // ✅ SALVAR REFERÊNCIA DO MODAL ATUAL
    currentUserModal = document.querySelector('.user-modal-backdrop');
    
    // ✅ PREVENIR SCROLL DO BODY
    document.body.style.overflow = 'hidden';
    
    // ✅ ADICIONAR EVENT LISTENERS GLOBAIS
    document.addEventListener('keydown', handleModalEscKey);
    document.addEventListener('click', handleModalBackdropClick);
    
    console.log('✅ Modal aberto com sucesso - Z-INDEX: 100');
}

// ====================
// FUNÇÕES DE GESTÃO AVANÇADA - ATUALIZADAS
// ====================

async function viewUserProfile(userId) {
    console.log('👤 Carregando perfil completo do usuário:', userId);
    
    try {
        showNotification('Carregando perfil do usuário...', 'info');
        
        const response = await fetch(`/admin-panel/user-profile/${userId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showUserProfileModal(data);
        } else {
            showNotification('Erro ao carregar perfil: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function toggleSuspiciousUser(userId) {
    if (!confirm('Marcar/desmarcar este usuário como suspeito?\nIsso também alterará o nível de risco para Alto/Baixo.')) return;
    
    try {
        const response = await fetch(`/admin-panel/toggle-suspicious/${userId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // ✅ FECHAR MODAL CORRETAMENTE E RECARREGAR
            closeUserModal();
            setTimeout(() => goToUsersPage(currentUsersPage), 1000);
        } else {
            showNotification('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao alterar status suspeito:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function updateUserRiskLevel(userId, riskLevel) {
    if (!confirm(`Alterar nível de risco para ${riskLevel === 'high' ? 'ALTO' : riskLevel === 'medium' ? 'MÉDIO' : 'BAIXO'}?`)) return;
    
    try {
        const response = await fetch(`/admin-panel/update-risk-level/${userId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ risk_level: riskLevel })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // ✅ FECHAR MODAL CORRETAMENTE E RECARREGAR
            closeUserModal();
            setTimeout(() => goToUsersPage(currentUsersPage), 1000);
        } else {
            showNotification('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar nível de risco:', error);
        showNotification('Erro de conexão', 'error');
    }
}

// ====================
// FUNÇÕES DE CONTROLE DE USUÁRIO - ATUALIZADAS
// ====================

async function toggleUserStatus(userId) {
    if (!confirm('Tem certeza que deseja alterar o status desta conta?')) return;
    
    try {
        const response = await fetch(`/admin-panel/toggle-user-status/${userId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // ✅ FECHAR MODAL CORRETAMENTE E RECARREGAR
            closeUserModal();
            setTimeout(() => goToUsersPage(currentUsersPage), 1000);
        } else {
            showNotification('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao alterar status do usuário:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function forceLogoutUser(userId) {
    if (!confirm('Forçar logout deste usuário? Ele será desconectado de todos os dispositivos.')) return;
    
    try {
        const response = await fetch(`/admin-panel/force-logout/${userId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
        } else {
            showNotification('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao forçar logout:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function sendPasswordReset(userId) {
    if (!confirm('Enviar email de redefinição de senha para este usuário?')) return;
    
    try {
        const response = await fetch(`/admin-panel/send-password-reset/${userId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
        } else {
            showNotification('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao enviar reset de senha:', error);
        showNotification('Erro de conexão', 'error');
    }
}

// ====================
// FUNÇÕES DE NOTIFICAÇÃO
// ====================

function showNotification(message, type = 'info') {
    // Criar container se não existir
    let notifications = document.getElementById('users-notifications');
    if (!notifications) {
        notifications = document.createElement('div');
        notifications.id = 'users-notifications';
        notifications.className = 'notifications-container mb-4';
        const usersSection = document.getElementById('usuarios-section');
        if (usersSection) {
            usersSection.insertBefore(notifications, usersSection.firstChild);
        }
    }
    
    const bgColors = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'warning': 'bg-yellow-500',
        'info': 'bg-blue-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `p-4 rounded-md text-white mb-2 ${bgColors[type]} transition-all duration-300 transform animate-fade-in`;
    notification.innerHTML = `
        <div class="flex justify-between items-center">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-lg">
                &times;
            </button>
        </div>
    `;
    
    notifications.appendChild(notification);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ====================
// INICIALIZAÇÃO CORRIGIDA - PREVENIR DUPLICAÇÃO
// ====================

function initializeUsersSection() {
    console.log('🚀 Inicializando seção de usuários...');
    
    // Prevenir múltiplas inicializações
    if (isUsersSectionInitialized) {
        console.log('⚠️ Seção já inicializada, ignorando...');
        return;
    }
    
    isUsersSectionInitialized = true;
    
    // Configurar delegação de eventos
    initializeUsersEventDelegation();
    
    // Configurar botões estáticos
    const addUserBtn = document.querySelector('.btn-add-user');
    if (addUserBtn) {
        addUserBtn.onclick = toggleAddUserForm;
    }
    
    const cancelBtn = document.querySelector('.btn-cancel-user');
    if (cancelBtn) {
        cancelBtn.onclick = toggleAddUserForm;
    }
    
    console.log('✅ Seção de usuários inicializada - COM DELEGAÇÃO');
}

// Resetar flag quando a seção for escondida
function resetUsersSection() {
    isUsersSectionInitialized = false;
    // ✅ FECHAR QUALQUER MODAL ABERTO
    if (currentUserModal) {
        closeUserModal();
    }
}

// ====================
// INICIALIZAÇÃO QUANDO A PÁGINA CARREGA - ATUALIZADA
// ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Carregado - Inicializando sistema de usuários');
    
    // Inicializar a seção de usuários se estiver visível
    const usersSection = document.getElementById('usuarios-section');
    if (usersSection && !usersSection.classList.contains('hidden')) {
        initializeUsersSection();
    }
    
    // Observar mudanças na visibilidade das seções
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.id === 'usuarios-section') {
                    if (!target.classList.contains('hidden')) {
                        console.log('👀 Seção de usuários tornou-se visível');
                        setTimeout(initializeUsersSection, 100);
                    } else {
                        console.log('👀 Seção de usuários foi escondida');
                        resetUsersSection();
                    }
                }
            }
        });
    });
    
    if (usersSection) {
        observer.observe(usersSection, { attributes: true });
    }
});

// Adicionar CSS para animações e correções de z-index
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }
    
    /* ✅ CORREÇÕES CRÍTICAS PARA O MODAL */
    .user-modal-backdrop {
        z-index: 100 !important;
    }
    
    .user-modal-content {
        z-index: 101 !important;
    }
    
    .close-modal-btn {
        cursor: pointer !important;
        z-index: 102 !important;
        position: relative !important;
    }
    
    /* ✅ PREVENIR INTERAÇÃO COM ELEMENTOS ATRÁS DO MODAL */
    .user-modal-backdrop {
        pointer-events: auto !important;
    }
    
    .user-modal-backdrop ~ * {
        pointer-events: none !important;
    }
    
    .user-modal-content,
    .user-modal-content * {
        pointer-events: auto !important;
    }
    
    /* ✅ GARANTIR QUE A SIDEBAR FIQUE ATRÁS DO MODAL */
    #sidebar {
        z-index: 40 !important;
    }
    
    #backdrop {
        z-index: 45 !important;
    }
`;
document.head.appendChild(style);