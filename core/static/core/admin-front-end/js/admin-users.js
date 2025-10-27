// ====================
// GERENCIAMENTO DE USUÁRIOS COM PAGINAÇÃO AJAX
// ====================

let currentUsersPage = 1;
let currentUsersSearch = '';

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
            initializeUsersSection();
            
            console.log('✅ Página carregada com sucesso');
        } else {
            console.error('❌ Seção de usuários não encontrada na resposta');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar página:', error);
        alert('Erro ao carregar usuários');
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
// AÇÕES DE USUÁRIO - AGORA INTEGRADAS COM BACKEND
// ====================

function viewUser(userId) {
    console.log('👁️ Visualizando usuário:', userId);
    alert(`Visualizando usuário ID: ${userId}`);
}

function editUser(userId) {
    console.log('✏️ Editando usuário:', userId);
    alert(`Editando usuário ID: ${userId}`);
}

async function deleteUser(userId) {
    console.log('🗑️ Excluindo usuário:', userId);
    
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        const row = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (row) {
            // Mostrar estado de carregamento
            row.style.opacity = '0.6';
            const deleteBtn = row.querySelector('.delete-user');
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                deleteBtn.disabled = true;
            }
            
            // Fazer requisição DELETE para o backend
            const response = await fetch(`/admin-panel/delete-user/${userId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remover a linha da tabela
                row.remove();
                alert(data.message || 'Usuário excluído com sucesso!');
                
                // Recarregar a página atual para atualizar a lista
                setTimeout(() => {
                    goToUsersPage(currentUsersPage);
                }, 500);
                
            } else {
                // Restaurar o botão
                if (deleteBtn) {
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteBtn.disabled = false;
                }
                row.style.opacity = '1';
                
                alert(data.error || 'Erro ao excluir usuário');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao excluir usuário:', error);
        alert('Erro de conexão ao excluir usuário');
        
        // Restaurar a linha em caso de erro
        const row = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (row) {
            row.style.opacity = '1';
            const deleteBtn = row.querySelector('.delete-user');
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.disabled = false;
            }
        }
    }
}

// Função auxiliar para obter o token CSRF
function getCsrfToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfToken ? csrfToken.value : '';
}

// ====================
// FORMULÁRIO DE ADICIONAR USUÁRIO
// ====================

function toggleAddUserForm() {
    const form = document.getElementById('add-user-form');
    if (form) {
        form.classList.toggle('hidden');
    }
}

async function handleUserSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken()
            }
        });
        
        if (response.ok) {
            alert('Usuário adicionado com sucesso!');
            toggleAddUserForm();
            form.reset();
            // Recarregar a lista de usuários
            goToUsersPage(currentUsersPage);
        } else {
            alert('Erro ao adicionar usuário');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

// ====================
// INICIALIZAÇÃO
// ====================

function initializeUsersSection() {
    console.log('🚀 Inicializando seção de usuários...');
    
    // Configurar busca
    const searchInput = document.getElementById('search-users-input');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleUsersSearch();
            }, 400);
        });

        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleUsersSearch();
            }
        });
    }
    
    // Configurar botões de paginação
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) {
                goToUsersPage(parseInt(page));
            }
        });
    });
    
    // Configurar botões de ação
    document.querySelectorAll('.view-user').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.getAttribute('data-user-id');
            viewUser(userId);
        });
    });

    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.getAttribute('data-user-id');
            editUser(userId);
        });
    });

    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const userId = this.getAttribute('data-user-id');
            deleteUser(userId);
        });
    });
    
    // Configurar formulário de adicionar usuário
    const addUserForm = document.querySelector('#add-user-form form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleUserSubmit);
    }
    
    // Configurar botão cancelar do formulário
    const cancelBtn = document.querySelector('.btn-cancel-user');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleAddUserForm();
        });
    }
    
    console.log('✅ Event listeners configurados');
}

// ====================
// INICIALIZAÇÃO QUANDO A PÁGINA CARREGA
// ====================

document.addEventListener('DOMContentLoaded', function() {
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
                if (target.id === 'usuarios-section' && !target.classList.contains('hidden')) {
                    setTimeout(initializeUsersSection, 100);
                }
            }
        });
    });
    
    if (usersSection) {
        observer.observe(usersSection, { attributes: true });
    }
});