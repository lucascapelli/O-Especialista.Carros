

// ====================
// Debug inicial
// ====================
console.log('products.js carregado');

// ====================
// Função utilitária: altura segura de elementos escondidos
// ====================
function getHiddenElementHeight(el) {
    if (!el) return 0;

    const originalDisplay = el.style.display;
    const originalVisibility = el.style.visibility;
    const originalPosition = el.style.position;

    el.style.display = 'block';
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';

    const height = el.offsetHeight;

    el.style.display = originalDisplay;
    el.style.position = originalPosition;
    el.style.visibility = originalVisibility;

    return height;
}

// ====================
// Espera pelos elementos do DOM
// ====================
function waitForElements() {
    return new Promise((resolve) => {
        const checkElements = () => {
            const recentTable = document.getElementById('recent-products-table-body');
            const allTable = document.getElementById('all-products-table-body');
            
            if (recentTable && allTable) {
                resolve({ recentTable, allTable });
            } else {
                console.log('Aguardando elementos do DOM...');
                setTimeout(checkElements, 100);
            }
        };
        checkElements();
    });
}

// ====================
// Inicialização segura dos produtos
// ====================
async function initializeProducts() {
    if (window._productsInitialized) return;
    window._productsInitialized = true;

    console.log("Inicializando produtos...");
    const { recentTable, allTable } = await waitForElements();
    console.log("Elementos encontrados:", { recentTable, allTable });

    fetchProdutos('recent');
    fetchProdutos('all');

    const form = document.getElementById('product-form');
    if (form && !form.dataset.listenerAdded) {
        form.addEventListener('submit', handleProductSubmit);
        form.dataset.listenerAdded = 'true';
        console.log("Listener do formulário adicionado");
    }

    const searchInput = document.getElementById('search-products');
    if (searchInput) searchInput.addEventListener('input', handleSearch);

    console.log('Altura tbody all-products (mesmo escondido):', getHiddenElementHeight(allTable));
}

// ====================
// DOMContentLoaded
// ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeProducts().catch(err => console.error('Erro na inicialização:', err));
});

// ====================
// Buscar produtos
// ====================
async function fetchProdutos(tipo) {
    try {
        console.log(`Buscando produtos do tipo: ${tipo}`);
        const response = await fetch('/api/produtos/', { credentials: 'include' });
        if (!response.ok) throw new Error('Erro ao buscar produtos');

        const data = await response.json();
        const produtos = Array.isArray(data) ? data : data.results || [];
        console.log(`Produtos (${tipo}):`, produtos);

        let produtosFiltrados = produtos;
        if (tipo === 'recent') {
            produtosFiltrados = [...produtos]
                .sort((a, b) => (b.id || 0) - (a.id || 0))
                .slice(0, 5);
        }

        renderProdutos(produtosFiltrados, tipo);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        const tbodyId = tipo === 'recent' ? 'recent-products-table-body' : 'all-products-table-body';
        const tbody = document.getElementById(tbodyId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                        Erro ao carregar produtos.
                    </td>
                </tr>`;
        }
    }
}

// ====================
// Renderizar produtos
// ====================
function renderProdutos(produtos, tipo) {
    const tbodyId = tipo === 'recent' ? 'recent-products-table-body' : 'all-products-table-body';
    const tbody = document.getElementById(tbodyId);

    console.log(`Renderizando ${produtos.length} produtos no elemento: ${tbodyId}`, tbody);

    if (!tbody) return console.error(`Elemento com ID "${tbodyId}" não encontrado.`);

    tbody.innerHTML = '';

    if (!produtos || produtos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    Nenhum produto encontrado.
                </td>
            </tr>`;
        return console.log(`Nenhum produto para renderizar em ${tbodyId}`);
    }

    produtos.forEach(produto => {
        const statusClass = getStatusClass(produto.status);
        const imagemUrl = produto.imagem || 'https://via.placeholder.com/40';
        const nome = produto.nome || 'Sem nome';
        const sku = produto.sku || 'N/A';
        const categoria = produto.categoria || 'Sem categoria';
        const preco = !isNaN(parseFloat(produto.preco)) ? parseFloat(produto.preco).toFixed(2) : '0.00';
        const estoque = !isNaN(parseInt(produto.estoque)) ? parseInt(produto.estoque) : 0;
        const status = produto.status || 'Desconhecido';
        const produtoEscapado = JSON.stringify(produto).replace(/'/g, "&#39;");

        const row = `
            <tr class="product-row">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <img class="h-10 w-10 rounded object-cover" src="${imagemUrl}" alt="${nome}" onerror="this.src='https://via.placeholder.com/40'">
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900 product-name">${nome}</div>
                            <div class="text-sm text-gray-500">SKU: ${sku}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 product-category">${categoria}</td>
                <td class="px-6 py-4 text-sm text-gray-500">R$ ${preco}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${estoque}</td>
                <td class="px-6 py-4">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    <button class="text-blue-600 hover:text-blue-900 mr-3 view-product" data-product='${produtoEscapado}'>
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-yellow-600 hover:text-yellow-900 mr-3 edit-product" data-product='${produtoEscapado}'>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-product" data-product-id="${produto.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    addProductEventListeners();
    console.log(`Renderizados ${produtos.length} produtos em ${tbodyId}`);
}

// ====================
// Event listeners dos botões
// ====================
function addProductEventListeners() {
    document.querySelectorAll('.view-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = btn.getAttribute('data-product');
            if (data) verProduto(JSON.parse(data));
        });
    });

    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = btn.getAttribute('data-product');
            if (data) editarProduto(JSON.parse(data));
        });
    });

    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-product-id');
            if (id) excluirProduto(id);
        });
    });
}

// ====================
// Busca
// ====================
function handleSearch(event) {
    const term = event.target.value.toLowerCase();
    document.querySelectorAll('#all-products-table-body .product-row').forEach(row => {
        const name = row.querySelector('.product-name').textContent.toLowerCase();
        const cat = row.querySelector('.product-category').textContent.toLowerCase();
        row.style.display = name.includes(term) || cat.includes(term) ? '' : 'none';
    });
}

// ====================
// Helpers
// ====================
function getStatusClass(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toLowerCase();
    if (s.includes('ativo')) return 'bg-green-100 text-green-800';
    if (s.includes('últimas') || s.includes('unidades')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
}

function getCSRFToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : '';
}

// ====================
// Formulário
// ====================
function handleProductSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    const isEdit = form.dataset.editMode === 'true';
    const id = form.dataset.productId;

    button.disabled = true;
    button.textContent = 'Salvando...';

    const url = isEdit ? `/api/produtos/${id}/` : '/api/produtos/';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, { method, headers: { 'X-CSRFToken': getCSRFToken() }, body: formData, credentials: 'include' })
        .then(res => res.ok ? res.json() : res.json().then(err => { throw err; }))
        .then(() => {
            alert(`Produto ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`);
            reloadProducts();
            form.reset();
            delete form.dataset.editMode;
            delete form.dataset.productId;
            if (typeof toggleAddProductForm === 'function') toggleAddProductForm();
        })
        .catch(err => alert(`Erro: ${err.detail || err.message || `Erro ao ${isEdit ? 'atualizar' : 'cadastrar'} produto.`}`))
        .finally(() => {
            button.disabled = false;
            button.textContent = originalText;
        });
}

// ====================
// Ações de produto
// ====================
function editarProduto(produto) {
    const fields = {
        'product-nome': produto.nome,
        'product-sku': produto.sku,
        'product-preco': produto.preco,
        'product-estoque': produto.estoque,
        'product-categoria': produto.categoria,
        'product-status': produto.status,
        'product-descricao': produto.descricao,
    };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    });

    const form = document.getElementById('product-form');
    if (form) {
        form.dataset.editMode = 'true';
        form.dataset.productId = produto.id;
        const btn = document.querySelector('.btn-add-product');
        if (btn) btn.innerHTML = '<i class="fas fa-edit mr-2"></i> Editar Produto';
    }

    if (typeof toggleAddProductForm === 'function') {
        const formEl = document.getElementById('add-product-form');
        if (formEl && formEl.classList.contains('hidden')) toggleAddProductForm();
    }
}

function verProduto(produto) {
    const nome = produto.nome || 'Sem nome';
    const categoria = produto.categoria || 'Sem categoria';
    const preco = !isNaN(parseFloat(produto.preco)) ? parseFloat(produto.preco).toFixed(2) : '0.00';
    const estoque = !isNaN(parseInt(produto.estoque)) ? parseInt(produto.estoque) : 0;
    const status = produto.status || 'Desconhecido';
    const descricao = produto.descricao || 'Sem descrição';

    alert(`Produto: ${nome}\nCategoria: ${categoria}\nPreço: R$ ${preco}\nEstoque: ${estoque}\nStatus: ${status}\nDescrição: ${descricao}`);
}

function excluirProduto(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    fetch(`/api/produtos/${id}/`, { method: 'DELETE', headers: { 'X-CSRFToken': getCSRFToken() }, credentials: 'include' })
        .then(res => res.ok ? reloadProducts() : Promise.reject('Erro ao excluir produto'))
        .catch(err => alert(err));
}

// ====================
// Recarregar listas
// ====================
function reloadProducts() {
    fetchProdutos('recent');
    fetchProdutos('all');
}

