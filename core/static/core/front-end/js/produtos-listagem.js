// produtos-listagem.js - Funcionalidades específicas para a página de listagem de produtos

// Filtros e busca
document.addEventListener('DOMContentLoaded', function() {
    // Elementos
    const categoriaBtns = document.querySelectorAll('.categoria-btn');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const productCards = document.querySelectorAll('.product-card');
    const productCount = document.getElementById('product-count');
    const gridViewBtn = document.getElementById('grid-view');
    const listViewBtn = document.getElementById('list-view');
    const productsGrid = document.getElementById('products-grid');
    const productsList = document.getElementById('products-list');

    // Estado dos filtros
    let currentCategory = 'todos';
    let currentSearch = '';
    let currentSort = 'nome';

    // Filtro por categoria
    categoriaBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class de todos os botões
            categoriaBtns.forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700');
            });
            
            // Adiciona active class ao botão clicado
            this.classList.remove('bg-gray-200', 'text-gray-700');
            this.classList.add('bg-blue-600', 'text-white');
            
            currentCategory = this.dataset.categoria;
            filterProducts();
        });
    });

    // Busca em tempo real
    searchInput.addEventListener('input', function() {
        currentSearch = this.value.toLowerCase();
        filterProducts();
    });

    // Ordenação
    sortSelect.addEventListener('change', function() {
        currentSort = this.value;
        sortProducts();
    });

    // Alternar entre grid e lista
    gridViewBtn.addEventListener('click', function() {
        productsGrid.classList.remove('hidden');
        productsList.classList.add('hidden');
        gridViewBtn.classList.add('text-blue-600', 'bg-blue-100');
        listViewBtn.classList.remove('text-blue-600', 'bg-blue-100');
        listViewBtn.classList.add('text-gray-400');
    });

    listViewBtn.addEventListener('click', function() {
        productsGrid.classList.add('hidden');
        productsList.classList.remove('hidden');
        listViewBtn.classList.add('text-blue-600', 'bg-blue-100');
        gridViewBtn.classList.remove('text-blue-600', 'bg-blue-100');
        gridViewBtn.classList.add('text-gray-400');
    });

    // Função de filtro
    function filterProducts() {
        let visibleCount = 0;

        productCards.forEach(card => {
            const categoria = card.dataset.categoria;
            const nome = card.dataset.nome;
            
            const categoriaMatch = currentCategory === 'todos' || categoria === currentCategory;
            const searchMatch = currentSearch === '' || nome.includes(currentSearch);
            
            if (categoriaMatch && searchMatch) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Atualiza contador
        productCount.textContent = `Mostrando ${visibleCount} produtos`;
        
        // Re-aplica ordenação
        sortProducts();
    }

    // Função de ordenação
    function sortProducts() {
        const container = productsGrid.classList.contains('hidden') ? productsList : productsGrid;
        const cards = Array.from(container.querySelectorAll('.product-card'));
        
        cards.sort((a, b) => {
            const priceA = parseFloat(a.querySelector('.text-green-600').textContent.replace('R$ ', '').replace(',', '.'));
            const priceB = parseFloat(b.querySelector('.text-green-600').textContent.replace('R$ ', '').replace(',', '.'));
            const nameA = a.querySelector('h3').textContent.toLowerCase();
            const nameB = b.querySelector('h3').textContent.toLowerCase();
            
            switch (currentSort) {
                case 'preco_asc':
                    return priceA - priceB;
                case 'preco_desc':
                    return priceB - priceA;
                case 'nome':
                    return nameA.localeCompare(nameB);
                case 'recentes':
                    // Ordenação por data (se disponível)
                    return 0; // Implementar se tiver data
                default:
                    return 0;
            }
        });

        // Reorganiza os elementos no DOM
        cards.forEach(card => {
            container.appendChild(card);
        });
    }

    // Inicializar funções globais
    atualizarMenuUsuario();
    atualizarContadorCarrinho();
});