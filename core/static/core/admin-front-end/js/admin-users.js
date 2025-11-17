// ====================
// GERENCIAMENTO DE USUÁRIOS COM PAGINAÇÃO AJAX - VERSÃO FODA
// ====================

let currentUsersPage = 1;
let currentUsersSearch = '';
let isUsersSectionInitialized = false;

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
// DELEGAÇÃO DE EVENTOS - SIMPLIFICADA (SÓ VISUALIZAR)
// ====================

function initializeUsersEventDelegation() {
    console.log('🎯 Configurando delegação de eventos...');
    
    // Usar delegação de eventos para elementos dinâmicos
    const usersSection = document.getElementById('usuarios-section');
    if (!usersSection) return;
    
    // Delegação para paginação
    usersSection.addEventListener('click', function(e) {
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
    });
    
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
// MODAL DE PERFIL DO USUÁRIO
// ====================

function showUserProfileModal(data) {
    console.log('🎯 Exibindo modal do perfil do usuário:', data.user.id);
    
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
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                <!-- Header -->
                <div class="p-6 border-b bg-gray-50">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-xl font-bold text-gray-800">Perfil Completo do Usuário</h3>
                            <p class="text-gray-600">${data.user.full_name} • ${data.user.email}</p>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="text-gray-500 hover:text-gray-700 text-2xl">
                            &times;
                        </button>
                    </div>
                </div>
                
                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-6">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Coluna 1: Informações Básicas -->
                        <div class="lg:col-span-1">
                            <div class="bg-white border border-gray-200 rounded-lg p-6">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b pb-2">
                                    <i class="fas fa-user-circle mr-2 text-blue-500"></i>
                                    Informações Pessoais
                                </h4>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Nome Completo</label>
                                        <p class="text-gray-800">${data.user.full_name}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Email</label>
                                        <p class="text-gray-800">${data.user.email}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Telefone</label>
                                        <p class="text-gray-800">${data.user.phone || 'Não informado'}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Status da Conta</label>
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${data.user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${data.user.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Tipo de Usuário</label>
                                        <p class="text-gray-800">
                                            ${data.user.is_staff ? 'Administrador' : 'Usuário Comum'}
                                            ${data.user.is_superuser ? ' (Superusuário)' : ''}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Status de Suspeita</label>
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${data.user.is_suspicious ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                            ${data.user.is_suspicious ? '🔴 Suspeito' : '✅ Normal'}
                                        </span>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Nível de Risco</label>
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskLevelColors[data.user.risk_level] || 'bg-gray-100 text-gray-800'}">
                                            ${riskLevelText[data.user.risk_level] || 'Desconhecido'}
                                        </span>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Data de Cadastro</label>
                                        <p class="text-gray-800">${data.user.date_joined ? new Date(data.user.date_joined).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Último Login</label>
                                        <p class="text-gray-800">${data.user.last_login ? new Date(data.user.last_login).toLocaleDateString('pt-BR') + ' ' + new Date(data.user.last_login).toLocaleTimeString('pt-BR') : 'Nunca'}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Última Atividade</label>
                                        <p class="text-gray-800">${data.user.last_activity ? new Date(data.user.last_activity).toLocaleString('pt-BR') : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600">Troca de Senha Obrigatória</label>
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${data.user.force_password_change ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}">
                                            ${data.user.force_password_change ? '🔑 Pendente' : '✅ Concluída'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Estatísticas -->
                            <div class="bg-white border border-gray-200 rounded-lg p-6 mt-6">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b pb-2">
                                    <i class="fas fa-chart-bar mr-2 text-green-500"></i>
                                    Estatísticas
                                </h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="text-center p-3 bg-blue-50 rounded-lg">
                                        <div class="text-2xl font-bold text-blue-600">${data.estatisticas.total_pedidos}</div>
                                        <div class="text-sm text-blue-800">Total de Pedidos</div>
                                    </div>
                                    <div class="text-center p-3 bg-green-50 rounded-lg">
                                        <div class="text-2xl font-bold text-green-600">R$ ${data.estatisticas.total_gasto.toFixed(2)}</div>
                                        <div class="text-sm text-green-800">Total Gasto</div>
                                    </div>
                                    <div class="text-center p-3 bg-purple-50 rounded-lg">
                                        <div class="text-2xl font-bold text-purple-600">${data.estatisticas.pedidos_ativos}</div>
                                        <div class="text-sm text-purple-800">Pedidos Ativos</div>
                                    </div>
                                    <div class="text-center p-3 bg-yellow-50 rounded-lg">
                                        <div class="text-2xl font-bold text-yellow-600">R$ ${data.estatisticas.ticket_medio.toFixed(2)}</div>
                                        <div class="text-sm text-yellow-800">Ticket Médio</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Controles de Risco -->
                            <div class="bg-white border border-gray-200 rounded-lg p-6 mt-6">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b pb-2">
                                    <i class="fas fa-shield-alt mr-2 text-red-500"></i>
                                    Controles de Risco
                                </h4>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 mb-2">Marcar como Suspeito</label>
                                        <button onclick="toggleSuspiciousUser(${data.user.id})" 
                                                class="w-full px-4 py-2 text-sm font-medium ${data.user.is_suspicious ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-md transition-colors border">
                                            ${data.user.is_suspicious ? '🔴 Remover Suspeita' : '⚠️ Marcar como Suspeito'}
                                        </button>
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-gray-600 mb-2">Nível de Risco</label>
                                        <div class="flex space-x-2">
                                            <button onclick="updateUserRiskLevel(${data.user.id}, 'low')" 
                                                    class="flex-1 px-3 py-2 text-xs font-medium ${data.user.risk_level === 'low' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'} rounded-md transition-colors border">
                                                Baixo
                                            </button>
                                            <button onclick="updateUserRiskLevel(${data.user.id}, 'medium')" 
                                                    class="flex-1 px-3 py-2 text-xs font-medium ${data.user.risk_level === 'medium' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700'} rounded-md transition-colors border">
                                                Médio
                                            </button>
                                            <button onclick="updateUserRiskLevel(${data.user.id}, 'high')" 
                                                    class="flex-1 px-3 py-2 text-xs font-medium ${data.user.risk_level === 'high' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'} rounded-md transition-colors border">
                                                Alto
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Coluna 2: Pedidos e Atividades -->
                        <div class="lg:col-span-2">
                            <!-- Alertas do Sistema -->
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div class="flex items-center mb-2">
                                    <i class="fas fa-info-circle text-blue-600 mr-2"></i>
                                    <h4 class="font-semibold text-blue-800">Sistema de Gestão de Usuários</h4>
                                </div>
                                <p class="text-blue-700 text-sm">
                                    <strong>Funcionalidades Ativas:</strong> Gestão de Risco, Controle de Contas, Análise de Pedidos e Pagamentos<br>
                                    <strong>ID do Usuário:</strong> ${data.user.id}
                                </p>
                            </div>

                            <!-- Atividades Suspeitas -->
                            ${data.atividades_suspeitas && data.atividades_suspeitas.length > 0 ? `
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div class="flex items-center mb-2">
                                    <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                                    <h4 class="font-semibold text-yellow-800">Alertas de Segurança</h4>
                                </div>
                                <ul class="list-disc list-inside text-yellow-700 space-y-1">
                                    ${data.atividades_suspeitas.map(activity => `<li>${activity}</li>`).join('')}
                                </ul>
                            </div>
                            ` : '<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"><div class="flex items-center"><i class="fas fa-check-circle text-green-600 mr-2"></i><h4 class="font-semibold text-green-800">Nenhum alerta de segurança detectado</h4></div></div>'}

                            <!-- Últimos Pedidos -->
                            <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b pb-2">
                                    <i class="fas fa-shopping-bag mr-2 text-purple-500"></i>
                                    Últimos Pedidos
                                </h4>
                                ${data.pedidos && data.pedidos.length > 0 ? `
                                <div class="overflow-x-auto">
                                    <table class="min-w-full text-sm">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-200">
                                            ${data.pedidos.map(pedido => `
                                            <tr class="hover:bg-gray-50">
                                                <td class="px-4 py-3 font-medium text-gray-900">${pedido.numero_pedido || 'N/A'}</td>
                                                <td class="px-4 py-3">
                                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}">
                                                        ${pedido.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 font-medium text-gray-900">R$ ${(pedido.total_final || 0).toFixed(2)}</td>
                                                <td class="px-4 py-3 text-gray-500">${pedido.criado_em ? new Date(pedido.criado_em).toLocaleDateString('pt-BR') : 'N/A'}</td>
                                            </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : '<p class="text-gray-500 text-center py-4">Nenhum pedido encontrado.</p>'}
                            </div>

                            <!-- Histórico de Pagamentos -->
                            <div class="bg-white border border-gray-200 rounded-lg p-6">
                                <h4 class="font-semibold text-lg mb-4 text-gray-800 border-b pb-2">
                                    <i class="fas fa-credit-card mr-2 text-green-500"></i>
                                    Histórico de Pagamentos
                                </h4>
                                ${data.pagamentos && data.pagamentos.length > 0 ? `
                                <div class="overflow-x-auto">
                                    <table class="min-w-full text-sm">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-200">
                                            ${data.pagamentos.map(pagamento => `
                                            <tr class="hover:bg-gray-50">
                                                <td class="px-4 py-3 font-medium text-gray-900">${pagamento.pedido_numero || 'N/A'}</td>
                                                <td class="px-4 py-3">
                                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(pagamento.status)}">
                                                        ${pagamento.status || 'N/A'}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 font-medium text-gray-900">R$ ${(pagamento.valor || 0).toFixed(2)}</td>
                                                <td class="px-4 py-3 text-gray-500">${pagamento.metodo || 'N/A'}</td>
                                            </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : '<p class="text-gray-500 text-center py-4">Nenhum pagamento encontrado.</p>'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer com Ações -->
                <div class="p-6 border-t bg-gray-50 flex justify-between items-center">
                    <div class="text-sm text-gray-600">
                        ID do usuário: ${data.user.id} • 
                        Risco: <span class="font-medium ${riskLevelColors[data.user.risk_level] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded">${riskLevelText[data.user.risk_level] || 'Desconhecido'}</span>
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="toggleUserStatus(${data.user.id})" 
                                class="px-4 py-2 text-sm font-medium ${data.user.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} rounded-md transition-colors">
                            ${data.user.is_active ? '❌ Desativar Conta' : '✅ Reativar Conta'}
                        </button>
                        <button onclick="forceLogoutUser(${data.user.id})" 
                                class="px-4 py-2 text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md transition-colors">
                            🚪 Forçar Logout
                        </button>
                        <button onclick="sendPasswordReset(${data.user.id})" 
                                class="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors">
                            🔑 Enviar Reset
                        </button>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Adicionar evento de tecla ESC para fechar modal
    const modal = document.querySelector('.fixed');
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
}

// ====================
// FUNÇÕES DE GESTÃO AVANÇADA
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
            // Fechar modal e recarregar
            document.querySelector('.fixed')?.remove();
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
            // Fechar modal e recarregar
            document.querySelector('.fixed')?.remove();
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
// FUNÇÕES DE CONTROLE DE USUÁRIO
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
            // Fechar modal e recarregar
            document.querySelector('.fixed')?.remove();
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

// Adicionar CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }
`;
document.head.appendChild(style);