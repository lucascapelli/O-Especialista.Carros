// ===== FUNÇÕES GLOBAIS =====

// Função para pegar o CSRFToken
function getCSRFToken() {
    try {
        const name = 'csrftoken=';
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookies = decodedCookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let c = cookies[i].trim();
            if (c.startsWith(name)) {
                return c.substring(name.length, c.length);
            }
        }
        console.warn('⚠️ CSRF token não encontrado');
        return '';
    } catch (error) {
        console.error('❌ Erro ao obter CSRF token:', error);
        return '';
    }
}

// Toast notifications
function showToast(message, type = 'success') {
    try {
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
            try {
                toast.remove();
            } catch (removeError) {
                console.error('❌ Erro ao remover toast:', removeError);
            }
        }, 3000);
    } catch (error) {
        console.error('❌ Erro ao mostrar toast:', error);
    }
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
        console.warn('⚠️ Erro na resposta de autenticação:', response.status);
        return false;
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        return false;
    }
}

// Modal de login
function showLoginModal() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao mostrar modal de login:', error);
        showToast('Erro ao abrir modal de login', 'error');
    }
}

// Redirecionar para login
function redirectToLogin() {
    try {
        // Salvar a página atual para voltar após login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = '/login/';
    } catch (error) {
        console.error('❌ Erro ao redirecionar para login:', error);
        showToast('Erro ao redirecionar para login', 'error');
    }
}

// ===== ATUALIZAR MENU DE USUÁRIO =====
async function atualizarMenuUsuario() {
    try {
        const response = await fetch('/api/check-auth/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const userIcon = document.querySelector('#user-icon');
        const userMenu = document.querySelector('#user-menu');
        const mobileUserMenu = document.querySelector('#mobile-user-menu');
        
        // Desktop Menu
        if (userIcon && userMenu) {
            if (data.authenticated) {
                // Usuário LOGADO - Menu dropdown
                userIcon.innerHTML = '<i class="fas fa-user-circle"></i>';
                userIcon.href = 'javascript:void(0)';
                userIcon.onclick = () => userMenu.classList.toggle('hidden');
                
                userMenu.innerHTML = `
                    <div class="px-4 py-3 border-b border-gray-100">
                        <p class="text-sm font-medium text-gray-900">Olá, ${data.user.first_name || 'Usuário'}</p>
                        <p class="text-xs text-gray-500 truncate">${data.user.email}</p>
                    </div>
                    <div class="py-1">
                        <a href="/perfil/" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <i class="fas fa-user mr-3 text-gray-400"></i>Meu Perfil
                        </a>
                        <a href="/meus-pedidos/" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <i class="fas fa-shopping-bag mr-3 text-gray-400"></i>Meus Pedidos
                        </a>
                        <div class="border-t border-gray-100 my-1"></div>
                        <button onclick="fazerLogout()" class="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors">
                            <i class="fas fa-sign-out-alt mr-3"></i>Sair
                        </button>
                    </div>
                `;
            } else {
                // Usuário NÃO LOGADO - Ícone simples
                userIcon.innerHTML = '<i class="fas fa-user"></i>';
                userIcon.href = '/login/';
                userIcon.onclick = null;
                userMenu.classList.add('hidden');
            }
        }
        
        // Mobile Menu
        if (mobileUserMenu) {
            if (data.authenticated) {
                mobileUserMenu.innerHTML = `
                    <a href="/perfil/" class="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-end hover:bg-gray-100">
                        <i class="fas fa-user mr-2"></i>Meu Perfil
                    </a>
                    <a href="/meus-pedidos/" class="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-end hover:bg-gray-100">
                        <i class="fas fa-shopping-bag mr-2"></i>Meus Pedidos
                    </a>
                    <button onclick="fazerLogout()" class="w-full text-left flex items-center px-3 py-2 text-base font-medium text-red-600 hover:bg-gray-100">
                        <i class="fas fa-sign-out-alt mr-2"></i>Sair
                    </button>
                `;
            } else {
                mobileUserMenu.innerHTML = `
                    <a href="/login/" class="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-end hover:bg-gray-100">
                        <i class="fas fa-sign-in-alt mr-2"></i>Login
                    </a>
                    <a href="/criar-conta/" class="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-end hover:bg-gray-100">
                        <i class="fas fa-user-plus mr-2"></i>Criar Conta
                    </a>
                `;
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar menu:', error);
    }
}

// ===== LOGOUT =====
function fazerLogout() {
    if (!confirm('Tem certeza que deseja sair?')) {
        return;
    }
    
    try {
        fetch('/logout/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (response.ok) {
                showToast('Logout realizado com sucesso!', 'success');
                setTimeout(() => {
                    window.location.href = '/home/';
                }, 1500);
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        })
        .catch(error => {
            console.error('❌ Erro no logout:', error);
            showToast('Erro ao fazer logout', 'error');
        });
    } catch (error) {
        console.error('❌ Erro no processo de logout:', error);
        showToast('Erro ao fazer logout', 'error');
    }
}

// ===== ATUALIZAR CONTADOR DO CARRINHO =====
async function atualizarContadorCarrinho() {
    try {
        const response = await fetch('/carrinho-json/');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const cartCount = document.getElementById('cart-count');
        const mobileCartCount = document.getElementById('mobile-cart-count');
        
        if (cartCount) cartCount.textContent = data.total_itens;
        if (mobileCartCount) mobileCartCount.textContent = data.total_itens;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar contador:', error);
    }
}

// ===== INICIALIZAÇÃO GLOBAL =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ scripts.js inicializado');
    
    try {
        // Verificar se estamos na página do carrinho
        if (window.location.pathname.includes('carrinho')) {
            console.log('📦 Página do carrinho detectada - inicialização mínima');
            // Não inicializar funções que podem conflitar
            return;
        }
        
        // ===== MENU MOBILE =====
        const mobileMenuButton = document.querySelector('.mobile-menu-button');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                try {
                    mobileMenu.classList.toggle('hidden');
                } catch (error) {
                    console.error('❌ Erro ao alternar menu mobile:', error);
                }
            });
        }

        // ===== SCROLL SUAVE =====
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                try {
                    e.preventDefault();
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') return;
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                        
                        // Fecha menu mobile se aberto
                        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                            mobileMenu.classList.add('hidden');
                        }
                    }
                } catch (error) {
                    console.error('❌ Erro no scroll suave:', error);
                }
            });
        });

        // ===== ADICIONAR PRODUTO AO CARRINHO =====
        const botoesComprar = document.querySelectorAll('.btn-comprar');
        botoesComprar.forEach(botao => {
            botao.addEventListener('click', function() {
                try {
                    const produtoId = this.dataset.produtoId;

                    fetch(`/adicionar_carrinho/${produtoId}/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCSRFToken(),
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(data => {
                                throw new Error(data.error || 'Erro ao adicionar produto');
                            });
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.success) {
                            atualizarContadorCarrinho();
                            showToast('✅ Produto adicionado ao carrinho!');
                        } else {
                            showToast('❌ Erro ao adicionar o produto.');
                        }
                    })
                    .catch(error => {
                        console.error('❌ Erro:', error);
                        showToast(`⚠️ ${error.message || 'Erro de conexão com o servidor.'}`);
                    });
                } catch (error) {
                    console.error('❌ Erro no clique do botão comprar:', error);
                    showToast('Erro ao adicionar produto', 'error');
                }
            });
        });

        // ===== FECHAR MENU AO CLICAR FORA =====
        document.addEventListener('click', function(event) {
            try {
                const userMenu = document.querySelector('#user-menu');
                const userIcon = document.querySelector('#user-icon');
                
                if (userMenu && userIcon && !userMenu.contains(event.target) && !userIcon.contains(event.target)) {
                    userMenu.classList.add('hidden');
                }
            } catch (error) {
                console.error('❌ Erro ao fechar menu:', error);
            }
        });

        // ===== INICIALIZAR COMPONENTES =====
        atualizarMenuUsuario();
        atualizarContadorCarrinho();
        
    } catch (error) {
        console.error('❌ Erro na inicialização do scripts.js:', error);
        showToast('Erro ao carregar funcionalidades da página', 'error');
    }
});

// ===== EXPORTAR FUNÇÕES GLOBAIS =====
window.getCSRFToken = getCSRFToken;
window.showToast = showToast;
window.checkUserAuthentication = checkUserAuthentication;
window.showLoginModal = showLoginModal;
window.redirectToLogin = redirectToLogin;
window.atualizarMenuUsuario = atualizarMenuUsuario;
window.fazerLogout = fazerLogout;
window.atualizarContadorCarrinho = atualizarContadorCarrinho;

console.log('✅ Funções globais disponíveis');