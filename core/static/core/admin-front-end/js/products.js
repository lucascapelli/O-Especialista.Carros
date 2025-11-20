// ====================
// Debug inicial
// ====================
console.log('🔄 products.js carregado - VERSÃO CORRIGIDA');

// ====================
// Variáveis globais
// ====================
let currentEditingProduct = null;

// ====================
// Inicialização segura dos produtos
// ====================
async function initializeProducts() {
    if (window._productsInitialized) return;
    window._productsInitialized = true;

    console.log("🔄 Inicializando produtos...");
    
    await fetchProdutos('recent');
    await fetchProdutos('all');

    const form = document.getElementById('product-form');
    if (form && !form.dataset.listenerAdded) {
        form.addEventListener('submit', handleProductSubmit);
        form.dataset.listenerAdded = 'true';
        console.log("✅ Listener do formulário adicionado");
    }

    const searchInput = document.getElementById('search-products');
    if (searchInput) searchInput.addEventListener('input', handleSearch);

    console.log('✅ Sistema de produtos inicializado');
}

// ====================
// DOMContentLoaded
// ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeProducts().catch(err => console.error('❌ Erro na inicialização:', err));
});

// ====================
// Buscar produtos
// ====================
async function fetchProdutos(tipo) {
    try {
        console.log(`🔍 Buscando produtos do tipo: ${tipo}`);
        const response = await fetch('/api/produtos/', { credentials: 'include' });
        if (!response.ok) throw new Error('Erro ao buscar produtos');

        const data = await response.json();
        const produtos = Array.isArray(data) ? data : data.results || [];
        console.log(`📦 Produtos (${tipo}):`, produtos.length);

        let produtosFiltrados = produtos;
        if (tipo === 'recent') {
            produtosFiltrados = [...produtos]
                .sort((a, b) => (b.id || 0) - (a.id || 0))
                .slice(0, 5);
        }

        renderProdutos(produtosFiltrados, tipo);
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
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

    console.log(`🎨 Renderizando ${produtos.length} produtos no elemento: ${tbodyId}`);

    if (!tbody) return console.error(`❌ Elemento com ID "${tbodyId}" não encontrado.`);

    tbody.innerHTML = '';

    if (!produtos || produtos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    Nenhum produto encontrado.
                </td>
            </tr>`;
        return console.log(`ℹ️ Nenhum produto para renderizar em ${tbodyId}`);
    }

    produtos.forEach(produto => {
        const statusClass = getStatusClass(produto.status);
        const imagemUrl = produto.imagem || produto.imagem_url || 'https://via.placeholder.com/40';
        const nome = produto.nome || 'Sem nome';
        const sku = produto.sku || 'N/A';
        const categoria = produto.categoria || 'Sem categoria';
        const preco = !isNaN(parseFloat(produto.preco)) ? parseFloat(produto.preco).toFixed(2) : '0.00';
        const estoque = !isNaN(parseInt(produto.estoque)) ? parseInt(produto.estoque) : 0;
        const status = produto.status || 'Desconhecido';
        
        // ✅ CORREÇÃO: Escapar corretamente o JSON
        const produtoEscapado = JSON.stringify(produto)
            .replace(/'/g, "&#39;")
            .replace(/"/g, "&quot;");

        const row = `
            <tr class="product-row">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <img class="h-10 w-10 rounded object-cover" src="${imagemUrl}" alt="${nome}" 
                             onerror="this.src='https://via.placeholder.com/40'">
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
                    <button class="text-blue-600 hover:text-blue-900 mr-3 view-product" 
                            data-product='${produtoEscapado}'>
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-yellow-600 hover:text-yellow-900 mr-3 edit-product" 
                            data-product='${produtoEscapado}'>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-product" 
                            data-product-id="${produto.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    addProductEventListeners();
    console.log(`✅ Renderizados ${produtos.length} produtos em ${tbodyId}`);
}

// ====================
// Event listeners dos botões
// ====================
function addProductEventListeners() {
    document.querySelectorAll('.view-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = btn.getAttribute('data-product');
            if (data) verProduto(JSON.parse(data.replace(/&#39;/g, "'").replace(/&quot;/g, '"')));
        });
    });

    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = btn.getAttribute('data-product');
            if (data) editarProduto(JSON.parse(data.replace(/&#39;/g, "'").replace(/&quot;/g, '"')));
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
// Função para Resetar o Formulário
// ====================
function resetProductForm() {
    const form = document.getElementById('product-form');
    if (form) {
        form.reset();
        delete form.dataset.editMode;
        delete form.dataset.productId;
        
        // ✅ Reseta o botão para "Adicionar Produto"
        const btn = document.querySelector('.btn-add-product');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-plus mr-2"></i> Adicionar Produto';
            delete btn.dataset.editingId;
        }
        
        // ✅ Esconde a visualização da imagem atual
        const currentImageContainer = document.getElementById('current-image-container');
        if (currentImageContainer) currentImageContainer.classList.add('hidden');
        
        // ✅ Limpa a variável global
        currentEditingProduct = null;
        
        console.log('🔄 Formulário resetado para modo criação');
    }
}

// ====================
// Formulário - CORRIGIDO
// ====================
function handleProductSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const isEdit = form.dataset.editMode === 'true';
    const id = form.dataset.productId;

    // ✅ DEBUG MELHORADO - Verifique TODOS os campos
    console.log('📦 Dados do formulário sendo enviados:');
    for (let [key, value] of formData.entries()) {
        console.log(`   ${key}: ${value}`);
    }

    // ✅ VALIDAÇÃO CRÍTICA: Se é edição e não enviou nova imagem, remove o campo imagem
    if (isEdit && !formData.get('imagem')) {
        formData.delete('imagem');
        console.log('🔄 Modo edição - removendo campo imagem vazio para manter imagem atual');
    }

    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;

    // ✅ VALIDAÇÃO DO ID NA EDIÇÃO
    if (isEdit && !id) {
        alert('❌ Erro: ID do produto não encontrado para edição.');
        return;
    }

    console.log(`🎯 Modo: ${isEdit ? 'EDIÇÃO' : 'CRIAÇÃO'}, ID: ${id || 'Novo'}`);

    button.disabled = true;
    button.textContent = isEdit ? 'Atualizando...' : 'Salvando...';

    const url = isEdit ? `/api/produtos/${id}/` : '/api/produtos/';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, { 
        method, 
        headers: { 
            'X-CSRFToken': getCSRFToken(),
            // ❌ NÃO enviar Content-Type para FormData - o browser define automaticamente com boundary
        }, 
        body: formData,
        credentials: 'include' 
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Produto salvo com sucesso:', data);
        alert(`✅ Produto ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso!`);
        reloadProducts();
        
        // ✅ LIMPEZA COMPLETA do formulário
        resetProductForm();
        
        if (typeof toggleAddProductForm === 'function') {
            toggleAddProductForm();
        }
    })
    .catch(err => {
        console.error('❌ Erro ao salvar produto:', err);
        const errorMsg = err.detail || err.error || err.message || `Erro ao ${isEdit ? 'atualizar' : 'cadastrar'} produto.`;
        alert(`❌ ${errorMsg}`);
    })
    .finally(() => {
        button.disabled = false;
        button.textContent = originalText;
    });
}

// ====================
// Ações de produto - CORRIGIDO
// ====================
function editarProduto(produto) {
    console.log('🔄 Editando produto:', produto);
    
    // ✅ Guarda o produto atual globalmente
    currentEditingProduct = produto;
    
    // ✅ LIMPA completamente o formulário primeiro
    const form = document.getElementById('product-form');
    if (form) {
        form.reset();
    }
    
    const fields = {
        'product-nome': produto.nome,
        'product-sku': produto.sku,
        'product-preco': produto.preco,
        'product-estoque': produto.estoque,
        'product-categoria': produto.categoria,
        'product-status': produto.status,
        'product-descricao': produto.descricao,
        'product-peso': produto.peso,
        'product-altura': produto.altura,
        'product-largura': produto.largura,
        'product-comprimento': produto.comprimento,
    };
    
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = val || '';
            console.log(`✅ Campo ${id} preenchido com:`, val);
        } else {
            console.warn(`⚠️ Campo não encontrado: ${id}`);
        }
    });

    // ✅ MOSTRA a imagem atual
    const currentImageContainer = document.getElementById('current-image-container');
    const currentImagePreview = document.getElementById('current-image-preview');
    if (currentImageContainer && currentImagePreview) {
        const imagemUrl = produto.imagem || produto.imagem_url;
        if (imagemUrl) {
            currentImagePreview.src = imagemUrl;
            currentImageContainer.classList.remove('hidden');
            console.log('🖼️ Mostrando imagem atual:', imagemUrl);
        } else {
            currentImageContainer.classList.add('hidden');
            console.log('ℹ️ Produto não tem imagem');
        }
    }

    // ✅ ATUALIZA os dados de edição NO FORMULÁRIO
    if (form) {
        form.dataset.editMode = 'true';
        form.dataset.productId = produto.id;
        console.log(`🎯 Modo edição ativado para produto ID: ${produto.id}`);
        
        const btn = document.querySelector('.btn-add-product');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-edit mr-2"></i> Editando Produto';
            btn.dataset.editingId = produto.id;
        }
    }

    // ✅ ABRE o formulário se estiver fechado
    if (typeof toggleAddProductForm === 'function') {
        const formEl = document.getElementById('add-product-form');
        if (formEl && formEl.classList.contains('hidden')) {
            toggleAddProductForm();
        }
    }
}

function verProduto(produto) {
    const nome = produto.nome || 'Sem nome';
    const categoria = produto.categoria || 'Sem categoria';
    const preco = !isNaN(parseFloat(produto.preco)) ? parseFloat(produto.preco).toFixed(2) : '0.00';
    const estoque = !isNaN(parseInt(produto.estoque)) ? parseInt(produto.estoque) : 0;
    const status = produto.status || 'Desconhecido';
    const descricao = produto.descricao || 'Sem descrição';

    alert(`📦 Produto: ${nome}\n🏷️ Categoria: ${categoria}\n💰 Preço: R$ ${preco}\n📊 Estoque: ${estoque}\n📈 Status: ${status}\n📝 Descrição: ${descricao}`);
}

function excluirProduto(id) {
    if (!confirm('❌ Tem certeza que deseja excluir este produto?\nEsta ação não pode ser desfeita.')) return;
    
    fetch(`/api/produtos/${id}/`, { 
        method: 'DELETE', 
        headers: { 'X-CSRFToken': getCSRFToken() }, 
        credentials: 'include' 
    })
    .then(response => {
        if (response.ok) {
            alert('✅ Produto excluído com sucesso!');
            reloadProducts();
        } else {
            throw new Error('Erro ao excluir produto');
        }
    })
    .catch(err => {
        console.error('❌ Erro ao excluir produto:', err);
        alert('❌ Erro ao excluir produto. Tente novamente.');
    });
}

// ====================
// Recarregar listas
// ====================
function reloadProducts() {
    console.log('🔄 Recarregando lista de produtos...');
    fetchProdutos('recent');
    fetchProdutos('all');
}

// ====================
// Toggle do formulário
// ====================
function toggleAddProductForm() {
    const form = document.getElementById('add-product-form');
    if (form) {
        form.classList.toggle('hidden');
        
        // ✅ Se estiver FECHANDO o formulário, reseta
        if (form.classList.contains('hidden')) {
            resetProductForm();
        }
    }
}