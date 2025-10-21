// Tailwind Config
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                    start: '#1e3a8a',
                    end: '#0ea5e9'
                },
                accent: '#fbbf24'
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    }
};

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const contentArea = document.getElementById('content-area');
    sidebar.classList.toggle('collapsed');
    contentArea.classList.toggle('expanded');
}

// Toggle Mobile Menu
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('backdrop');
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
}

// Show Section
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section-content');
    const navLinks = document.querySelectorAll('.nav-link');

    // Esconde todas as seções
    sections.forEach(section => {
        section.classList.add('hidden');
        if (section.id === `${sectionId}-section`) {
            section.classList.remove('hidden');
        }
    });

    // Atualiza o link ativo
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    // Fecha o menu mobile
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('backdrop');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        backdrop.classList.remove('open');
    }

    // 🚀 Se o usuário abriu a aba "Produtos", força a renderização
    if (sectionId === 'produtos' && typeof fetchProdutos === 'function') {
        console.log('Aba "Produtos" aberta — renderizando produtos...');
        
        // Aguarda o browser reexibir o conteúdo antes de renderizar
        setTimeout(() => {
            try {
                fetchProdutos('all');
                fetchProdutos('recent');
                console.log('Produtos carregados após exibir a aba.');
            } catch (err) {
                console.error('Erro ao renderizar produtos:', err);
            }
        }, 150); // pequeno atraso garante repaint
    }
}


// Toggle Add Product Form
function toggleAddProductForm() {
    const form = document.getElementById('add-product-form');
    form.classList.toggle('hidden');
}

// Toggle Add User Form
function toggleAddUserForm() {
    const form = document.getElementById('add-user-form');
    form.classList.toggle('hidden');
}

// Handle User Form Submission
function handleUserSubmit(event) {
    event.preventDefault();
    alert('Usuário salvo com sucesso!'); // Placeholder para futura implementação real
    toggleAddUserForm();
}
