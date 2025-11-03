// Mobile menu toggle - Versão simplificada sem duplicação
document.addEventListener('DOMContentLoaded', function() {
    // ===== MENU MOBILE =====
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // ===== SCROLL SUAVE =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
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
        });
    });

    // ===== ATUALIZAR CONTADOR DO CARRINHO =====
    function updateCartCount(total = null) {
        const cartCountElement = document.querySelector('.fa-shopping-cart')?.nextElementSibling;
        if (cartCountElement) {
            if (total !== null) {
                cartCountElement.textContent = total;
            } else {
                // Atualiza baseado na API
                fetch('/carrinho-json/')
                    .then(response => response.json())
                    .then(data => {
                        cartCountElement.textContent = data.total_itens || 0;
                    });
            }
        }
    }

    updateCartCount(); // inicializa ao carregar

    // ===== ADICIONAR PRODUTO AO CARRINHO =====
    const botoesComprar = document.querySelectorAll('.btn-comprar');
    botoesComprar.forEach(botao => {
        botao.addEventListener('click', function() {
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
                    updateCartCount(data.total_itens);
                    showToast('✅ Produto adicionado ao carrinho!');
                } else {
                    showToast('❌ Erro ao adicionar o produto.');
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                showToast(`⚠️ ${error.message || 'Erro de conexão com o servidor.'}`);
            });
        });
    });

    // ===== PEGAR CSRF TOKEN =====
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

    // ===== TOAST SIMPLES =====
    function showToast(msg) {
        // Remove toast anterior se existir
        const toastAntigo = document.querySelector('.custom-toast');
        if (toastAntigo) {
            toastAntigo.remove();
        }

        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.className = 'fixed bottom-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 custom-toast';
        
        // Adiciona classe de erro se for mensagem de erro
        if (msg.includes('❌') || msg.includes('⚠️') || msg.includes('Erro')) {
            toast.classList.remove('bg-green-600');
            toast.classList.add('bg-red-600');
        }
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});