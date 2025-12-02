// produtos.js - Versão Corrigida e Otimizada

//===== GALERIA DE IMAGENS DO PRODUTO =====
function initImageGallery() {
    const thumbnails = document.querySelectorAll('.thumbnail-item');
    const mainImage = document.getElementById('main-image');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function() {
            // Remove a classe active de todas as miniaturas
            thumbnails.forEach(t => {
                t.classList.remove('active', 'border-blue-500', 'shadow-lg');
                t.classList.add('border-gray-200', 'shadow-sm');
            });

            // Adiciona a classe active na miniatura clicada
            this.classList.add('active', 'border-blue-500', 'shadow-lg');
            this.classList.remove('border-gray-200', 'shadow-sm');

            // Atualiza a imagem principal usando data-image-src
            const imageSrc = this.getAttribute('data-image-src');
            
            if (imageSrc && mainImage) {
                mainImage.src = imageSrc;
                
                // Efeito de transição
                mainImage.style.opacity = '0.7';
                setTimeout(() => {
                    mainImage.style.opacity = '1';
                }, 150);
            }
        });
    });

    // Efeito de zoom na imagem principal
    if (mainImage) {
        mainImage.addEventListener('click', function() {
            const isZoomed = this.style.transform === 'scale(1.8)';
            this.style.transform = isZoomed ? 'scale(1)' : 'scale(1.8)';
            this.style.transition = 'transform 0.3s ease';
            this.style.cursor = isZoomed ? 'zoom-in' : 'zoom-out';
        });

        // Sai do zoom quando clica fora
        document.addEventListener('click', function(e) {
            if (!mainImage.contains(e.target) && !e.target.classList.contains('thumbnail-item')) {
                mainImage.style.transform = 'scale(1)';
                mainImage.style.cursor = 'zoom-in';
            }
        });
    }
}

//===== CONTROLES DE QUANTIDADE =====
function initQuantityControls() {
    const btnDiminuir = document.querySelector('.btn-diminuir');
    const btnAumentar = document.querySelector('.btn-aumentar');
    const quantitySpan = document.getElementById('quantity');

    if (btnDiminuir && btnAumentar && quantitySpan) {
        let currentQuantity = 1;
        
        btnAumentar.addEventListener('click', function() {
            if (currentQuantity < 10) {
                currentQuantity++;
                quantitySpan.textContent = currentQuantity;
            }
        });

        btnDiminuir.addEventListener('click', function() {
            if (currentQuantity > 1) {
                currentQuantity--;
                quantitySpan.textContent = currentQuantity;
            }
        });
    }
}

//===== FUNÇÃO PARA ADICIONAR AO CARRINHO =====
async function adicionarAoCarrinho(productId, quantity = 1) {
    try {
        const response = await fetch(`/adicionar_carrinho/${productId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantidade: quantity })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            showToast('✅ Produto adicionado ao carrinho!', 'success');
            
            // Atualizar contador do carrinho
            if (typeof atualizarContadorCarrinho === 'function') {
                atualizarContadorCarrinho();
            }
        } else {
            showToast('❌ Erro: ' + (data.error || 'Erro ao adicionar produto'), 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao adicionar ao carrinho:', error);
        showToast('❌ Erro de conexão', 'error');
    }
}

//===== FUNÇÃO PARA COMPRAR AGORA =====
async function comprarAgora(productId, quantity = 1) {
    try {
        // Primeiro adiciona ao carrinho
        const response = await fetch(`/adicionar_carrinho/${productId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantidade: quantity })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            showToast('✅ Produto adicionado! Redirecionando...', 'success');
            
            // Atualizar contador do carrinho
            if (typeof atualizarContadorCarrinho === 'function') {
                atualizarContadorCarrinho();
            }
            
            // Redireciona para o carrinho após 1 segundo
            setTimeout(() => {
                window.location.href = '/carrinho/';
            }, 1000);
        } else {
            showToast('❌ Erro: ' + (data.error || 'Erro ao adicionar produto'), 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao comprar agora:', error);
        showToast('❌ Erro de conexão', 'error');
    }
}

//===== EVENT LISTENERS GLOBAIS =====
function initGlobalEventListeners() {
    // Event delegation para todos os botões
    document.addEventListener('click', function(e) {
        // Botão principal de adicionar ao carrinho
        if (e.target.closest('.btn-adicionar-carrinho')) {
            const button = e.target.closest('.btn-adicionar-carrinho');
            const productId = button.dataset.produtoId;
            const quantity = parseInt(document.getElementById('quantity')?.textContent || '1');
            adicionarAoCarrinho(productId, quantity);
        }
        
        // Botão de produtos relacionados
        if (e.target.closest('.btn-adicionar-carrinho-relacionado')) {
            const button = e.target.closest('.btn-adicionar-carrinho-relacionado');
            const productId = button.dataset.produtoId;
            adicionarAoCarrinho(productId, 1);
        }
        
        // Botão comprar agora
        if (e.target.closest('.btn-comprar-agora')) {
            const button = e.target.closest('.btn-comprar-agora');
            const productId = button.dataset.produtoId;
            const quantity = parseInt(document.getElementById('quantity')?.textContent || '1');
            comprarAgora(productId, quantity);
        }
    });
}

//===== FUNÇÕES AUXILIARES =====
function getCSRFToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    return cookieValue || '';
}

function showToast(message, type = 'info') {
    // Remove toast anterior se existir
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

//===== VERIFICAÇÃO DE AUTENTICAÇÃO =====
async function checkUserAuthentication() {
    try {
        const response = await fetch('/api/check-auth/', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        return data.authenticated || false;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return false;
    }
}

function showLoginModal() {
    // Implementação básica do modal de login
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 class="text-lg font-semibold mb-4">Login Necessário</h3>
            <p class="text-gray-600 mb-4">Você precisa estar logado para finalizar a compra.</p>
            <div class="flex space-x-3">
                <button onclick="window.location.href='/login/'" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-200">
                    Fazer Login
                </button>
                <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition duration-200">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

//===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ produtos.js inicializado');
    
    // Inicializar componentes
    initImageGallery();
    initQuantityControls();
    initGlobalEventListeners();
    
    // Inicializar funções globais se existirem
    if (typeof atualizarMenuUsuario === 'function') {
        atualizarMenuUsuario();
    }
    if (typeof atualizarContadorCarrinho === 'function') {
        atualizarContadorCarrinho();
    }
});

//===== EXPORTAÇÕES GLOBAIS =====
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.comprarAgora = comprarAgora;
window.initImageGallery = initImageGallery;
window.checkUserAuthentication = checkUserAuthentication;
window.showLoginModal = showLoginModal;

console.log('✅ Funções de produtos disponíveis globalmente');