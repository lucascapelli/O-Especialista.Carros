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

    // Mapeamento das categorias - CORREÇÃO CRÍTICA
    const categoriaMap = {
        'todos': 'todos',
        'limpeza': 'Lavagem',
        'polimento': 'Polimento', 
        'interior': 'Interior',
        'protecao': 'Proteção'
    };

    // Filtro por categoria - CORRIGIDO
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
            console.log('🔍 Categoria selecionada:', currentCategory, '-> Mapeada para:', categoriaMap[currentCategory]);
            filterProducts();
        });
    });

    // Busca em tempo real
    searchInput.addEventListener('input', function() {
        currentSearch = this.value.toLowerCase();
        console.log('🔍 Buscando por:', currentSearch);
        filterProducts();
    });

    // Ordenação
    sortSelect.addEventListener('change', function() {
        currentSort = this.value;
        console.log('📊 Ordenando por:', currentSort);
        sortProducts();
    });

    // Alternar entre grid e lista
    gridViewBtn.addEventListener('click', function() {
        productsGrid.classList.remove('hidden');
        productsList.classList.add('hidden');
        gridViewBtn.classList.add('text-blue-600', 'bg-blue-100');
        listViewBtn.classList.remove('text-blue-600', 'bg-blue-100');
        listViewBtn.classList.add('text-gray-400');
        console.log('👁️ Visualização: Grid');
    });

    listViewBtn.addEventListener('click', function() {
        productsGrid.classList.add('hidden');
        productsList.classList.remove('hidden');
        listViewBtn.classList.add('text-blue-600', 'bg-blue-100');
        gridViewBtn.classList.remove('text-blue-600', 'bg-blue-100');
        gridViewBtn.classList.add('text-gray-400');
        console.log('👁️ Visualização: Lista');
    });

    // Função de filtro - CORRIGIDA
    function filterProducts() {
        let visibleCount = 0;
        const categoriaFiltro = categoriaMap[currentCategory] || currentCategory;

        console.log('🎯 Aplicando filtros:', {
            categoriaBotao: currentCategory,
            categoriaMapeada: categoriaFiltro,
            busca: currentSearch
        });

        productCards.forEach(card => {
            const categoriaCard = card.dataset.categoria;
            const nomeCard = card.dataset.nome;
            
            // CORREÇÃO: Usar o mapeamento correto das categorias
            const categoriaMatch = currentCategory === 'todos' || categoriaCard === categoriaFiltro;
            const searchMatch = currentSearch === '' || nomeCard.includes(currentSearch);
            
            if (categoriaMatch && searchMatch) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Atualiza contador
        productCount.textContent = `Mostrando ${visibleCount} produtos`;
        console.log(`📊 Produtos visíveis: ${visibleCount} de ${productCards.length}`);
        
        // Re-aplica ordenação
        sortProducts();
    }

    // Função de ordenação - MELHORADA
    function sortProducts() {
        const container = productsGrid.classList.contains('hidden') ? productsList : productsGrid;
        const cards = Array.from(container.querySelectorAll('.product-card[style*="block"], .product-card:not([style*="none"])'));
        
        console.log(`🔄 Ordenando ${cards.length} produtos por: ${currentSort}`);
        
        cards.sort((a, b) => {
            try {
                const priceA = parseFloat(a.querySelector('.text-green-600').textContent.replace('R$ ', '').replace(',', '.').trim());
                const priceB = parseFloat(b.querySelector('.text-green-600').textContent.replace('R$ ', '').replace(',', '.').trim());
                const nameA = a.querySelector('h3').textContent.toLowerCase().trim();
                const nameB = b.querySelector('h3').textContent.toLowerCase().trim();
                
                switch (currentSort) {
                    case 'preco_asc':
                        return priceA - priceB;
                    case 'preco_desc':
                        return priceB - priceA;
                    case 'nome':
                        return nameA.localeCompare(nameB);
                    case 'recentes':
                        // Para ordenação por data, você precisaria adicionar data-criacao nos cards
                        return 0;
                    default:
                        return 0;
                }
            } catch (error) {
                console.error('❌ Erro na ordenação:', error);
                return 0;
            }
        });

        // Reorganiza os elementos no DOM apenas se necessário
        if (cards.length > 0) {
            const fragment = document.createDocumentFragment();
            cards.forEach(card => fragment.appendChild(card));
            container.appendChild(fragment);
            console.log('✅ Produtos reordenados');
        }
    }

    // Debug inicial
    console.log('✅ produtos-listagem.js carregado');
    console.log('📦 Total de produtos:', productCards.length);
    console.log('🎯 Categorias disponíveis:', categoriaMap);

    // Inicializar funções globais
    if (typeof atualizarMenuUsuario === 'function') {
        atualizarMenuUsuario();
    }
    if (typeof atualizarContadorCarrinho === 'function') {
        atualizarContadorCarrinho();
    }
});

// Função para adicionar produto ao carrinho (se necessário)
function adicionarAoCarrinho(produtoId) {
    console.log('🛒 Adicionando produto ao carrinho:', produtoId);
    // Implementar lógica do carrinho aqui
}