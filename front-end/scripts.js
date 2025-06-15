// Mobile menu toggle - Versão simplificada sem duplicação
document.addEventListener('DOMContentLoaded', function() {
    // Menu Mobile
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                
                // Close mobile menu if open
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            }
        });
    });

    // Cart functionality
    function updateCartCount() {
        const cartCountElement = document.querySelector('.fa-shopping-cart')?.nextElementSibling;
        if (cartCountElement) {
            const itemCount = document.querySelectorAll('.cart-item').length;
            cartCountElement.textContent = itemCount > 0 ? itemCount : '0';
        }
    }

    // Initialize cart count if exists
    updateCartCount();
});