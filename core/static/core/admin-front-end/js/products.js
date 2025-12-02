// ====================
// Debug inicial
// ====================
console.log('🔄 products.js carregado - VERSÃO COM MODAL PADRÃO USUÁRIOS');

// ====================
// Variáveis globais
// ====================
let currentEditingProduct = null;
let currentProductModal = null; // ✅ Controle global do modal

// ====================
// Inicialização segura dos produtos
// ====================
async function initializeProducts() {
    if (window._productsInitialized) return;
    window._productsInitialized = true;

    console.log("🔄 Inicializando produtos...");
    
    // ✅ CONFIGURAR FILTROS ANTES de buscar produtos
    setupStatusFilter();
    
    await fetchProdutos('recent');
    await fetchProdutos('all');

    const form = document.getElementById('product-form');
    if (form && !form.dataset.listenerAdded) {
        form.addEventListener('submit', handleProductSubmit);
        form.dataset.listenerAdded = 'true';
        console.log("✅ Listener do formulário adicionado");
    }

    console.log('✅ Sistema de produtos inicializado');
}

// ====================
// DOMContentLoaded
// ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeProducts().catch(err => console.error('❌ Erro na inicialização:', err));
    
    // Configurar event listeners para a galeria
    const galleryInput = document.getElementById('gallery-images');
    if (galleryInput) {
        galleryInput.addEventListener('change', function() {
            const fileCount = this.files.length;
            const btnUpload = document.getElementById('btn-upload-gallery');
            if (btnUpload && fileCount > 0) {
                btnUpload.textContent = `Upload (${fileCount} imagem${fileCount > 1 ? 'ns' : ''})`;
            }
        });
    }
});

// ====================
// SISTEMA DE MODAL - PADRÃO USUÁRIOS
// ====================

// ✅ FUNÇÃO PARA FECHAR MODAL
function closeProductModal() {
    console.log('🔒 Fechando modal de produto');
    
    const modal = document.getElementById('product-view-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        currentProductModal = null;
        
        // ✅ REMOVER EVENT LISTENERS GLOBAIS
        document.removeEventListener('keydown', handleProductModalEscKey);
        
        console.log('✅ Modal fechado com sucesso');
    }
}

// ✅ HANDLER PARA TECLA ESC
function handleProductModalEscKey(e) {
    if (e.key === 'Escape') {
        closeProductModal();
    }
}

// ✅ FUNÇÃO PRINCIPAL PARA MOSTRAR MODAL
async function showProductModal(product) {
    console.log('🎯 Exibindo modal do produto:', product.id);
    
    // ✅ FECHAR MODAL EXISTENTE ANTES DE ABRIR OUTRO
    if (currentProductModal) {
        closeProductModal();
    }
    
    // ✅ CARREGAR GALERIA DO PRODUTO
    let galleryImages = [];
    try {
        const response = await fetch(`/api/imagens-produto/?produto_id=${product.id}`);
        if (response.ok) {
            galleryImages = await response.json();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar galeria:', error);
    }
    
    // ✅ CALCULAR NÍVEL DE ESTOQUE
    const stockNum = parseInt(product.estoque) || 0;
    const stockLevel = stockNum <= 5 ? 'low' : stockNum <= 20 ? 'medium' : 'high';
    const stockWidth = stockLevel === 'low' ? '25%' : stockLevel === 'medium' ? '50%' : '75%';
    const stockColor = stockLevel === 'low' ? 'bg-red-500' : stockLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
    const stockTextColor = stockLevel === 'low' ? 'text-red-600' : stockLevel === 'medium' ? 'text-yellow-600' : 'text-green-600';
    
    // ✅ PREENCHER DADOS BÁSICOS
    document.getElementById('modal-product-name').textContent = product.nome || 'Produto sem nome';
    document.getElementById('modal-product-sku').textContent = `SKU: ${product.sku || 'N/A'} • ${product.categoria || 'Sem categoria'}`;
    
    // Imagem principal
    const mainImage = document.getElementById('modal-product-image');
    mainImage.src = product.imagem || product.imagem_url || 'https://via.placeholder.com/300';
    mainImage.alt = product.nome || 'Imagem do produto';
    
    // Status e estoque
    const statusElement = document.getElementById('modal-product-status');
    statusElement.textContent = product.status || 'Desconhecido';
    statusElement.className = `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(product.status)}`;
    
    document.getElementById('modal-product-stock').textContent = product.estoque || 0;
    document.getElementById('modal-product-stock').className = `text-2xl font-bold ${stockTextColor} mr-2`;
    
    const stockBar = document.getElementById('modal-stock-bar');
    stockBar.className = `h-2.5 rounded-full ${stockColor}`;
    stockBar.style.width = stockWidth;
    
    // Dimensões
    document.getElementById('modal-product-weight').textContent = product.peso || '0.000';
    document.getElementById('modal-product-height').textContent = product.altura || '0.00';
    document.getElementById('modal-product-width').textContent = product.largura || '0.00';
    document.getElementById('modal-product-length').textContent = product.comprimento || '0.00';
    
    // Informações detalhadas
    document.getElementById('modal-product-full-name').textContent = product.nome || 'Não informado';
    document.getElementById('modal-product-sku-full').textContent = product.sku || 'N/A';
    document.getElementById('modal-product-category').textContent = product.categoria || 'Sem categoria';
    document.getElementById('modal-product-price').textContent = `R$ ${parseFloat(product.preco || 0).toFixed(2)}`;
    
    const descElement = document.getElementById('modal-product-description');
    descElement.innerHTML = product.descricao 
        ? product.descricao.replace(/\n/g, '<br>')
        : '<p class="text-gray-500 italic">Nenhuma descrição informada</p>';
    
    // Galeria de imagens
    const galleryContainer = document.getElementById('modal-product-gallery');
    if (galleryImages.length > 0) {
        galleryContainer.innerHTML = galleryImages.map((img, index) => `
            <div class="relative group">
                <img src="${img.imagem_url || img.imagem}" 
                     alt="Imagem ${index + 1} da galeria"
                     class="w-full h-32 object-cover rounded-lg border border-gray-300 group-hover:opacity-90 transition duration-200">
                ${img.is_principal ? `
                <span class="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">Principal</span>
                ` : ''}
            </div>
        `).join('');
    } else {
        galleryContainer.innerHTML = `
            <div class="col-span-4 text-center py-8 text-gray-500">
                <i class="fas fa-images text-4xl mb-3 opacity-50"></i>
                <p>Nenhuma imagem na galeria</p>
                <p class="text-sm mt-1">Adicione imagens na edição do produto</p>
            </div>
        `;
    }
    
    // Informações técnicas
    document.getElementById('modal-product-id').textContent = product.id || 'N/A';
    
    const createdDate = product.created_at ? new Date(product.created_at).toLocaleDateString('pt-BR') : 'N/A';
    document.getElementById('modal-product-created').textContent = createdDate;
    
    // ✅ CONFIGURAR BOTÕES DE AÇÃO DINAMICAMENTE
    const editBtn = document.getElementById('modal-edit-product-btn');
    const statusBtn = document.getElementById('modal-toggle-status-btn');
    
    if (editBtn) {
        // Remover listeners antigos
        editBtn.replaceWith(editBtn.cloneNode(true));
        const newEditBtn = document.getElementById('modal-edit-product-btn');
        
        newEditBtn.onclick = () => {
            closeProductModal();
            setTimeout(() => editarProduto(product), 100);
        };
    }
    
    if (statusBtn) {
        // Remover listeners antigos
        statusBtn.replaceWith(statusBtn.cloneNode(true));
        const newStatusBtn = document.getElementById('modal-toggle-status-btn');
        
        const statusIcon = product.status === 'Ativo' ? 'fa-eye-slash' : 'fa-eye';
        const statusText = product.status === 'Ativo' ? 'Inativar' : 'Ativar';
        const statusColor = product.status === 'Ativo' ? 'yellow' : 'green';
        
        newStatusBtn.innerHTML = `<i class="fas ${statusIcon} mr-2"></i>${statusText}`;
        newStatusBtn.className = `px-4 py-2 text-sm font-medium bg-${statusColor}-100 text-${statusColor}-700 hover:bg-${statusColor}-200 border-${statusColor}-300 rounded-lg transition-all duration-200 border flex items-center`;
        
        newStatusBtn.onclick = () => {
            closeProductModal();
            setTimeout(() => toggleProductStatus(product.id, product.status), 100);
        };
    }
    
    // ✅ MOSTRAR MODAL
    const modal = document.getElementById('product-view-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    currentProductModal = modal;
    
    // ✅ ADICIONAR EVENT LISTENERS GLOBAIS
    document.addEventListener('keydown', handleProductModalEscKey);
    
    console.log('✅ Modal do produto aberto com sucesso');
}

// ====================
// FUNÇÕES DE GESTÃO DE PRODUTOS (mantenha as existentes)
// ====================

// Funções para Galeria de Imagens...
async function loadProductGallery(productId) {
    try {
        console.log(`🖼️ Carregando galeria do produto ${productId}`);
        const response = await fetch(`/api/imagens-produto/?produto_id=${productId}`);
        
        if (!response.ok) throw new Error('Erro ao carregar galeria');
        
        const imagens = await response.json();
        console.log(`📸 Galeria carregada: ${imagens.length} imagens`);
        renderGalleryImages(imagens);
        
    } catch (error) {
        console.error('❌ Erro ao carregar galeria:', error);
        const galleryContainer = document.getElementById('gallery-images-list');
        if (galleryContainer) {
            galleryContainer.innerHTML = `
                <div class="text-center py-4 text-red-500">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Erro ao carregar galeria
                </div>
            `;
        }
    }
}

function renderGalleryImages(imagens) {
    const galleryContainer = document.getElementById('gallery-images-list');
    if (!galleryContainer) return;
    
    if (!imagens || imagens.length === 0) {
        galleryContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-images text-4xl mb-2"></i>
                <p>Nenhuma imagem na galeria</p>
            </div>
        `;
        return;
    }

    galleryContainer.innerHTML = imagens.map((imagem, index) => `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200" data-image-id="${imagem.id}">
            <div class="flex items-center space-x-4">
                <img src="${imagem.imagem_url || imagem.imagem}" 
                     alt="${imagem.legenda || 'Imagem da galeria'}"
                     class="w-16 h-16 object-cover rounded-lg border border-gray-300">
                <div>
                    <p class="font-medium text-gray-800">Imagem ${index + 1}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Ordem: ${imagem.ordem}</span>
                        <span class="flex items-center">
                            <input type="checkbox" ${imagem.is_principal ? 'checked' : ''} 
                                   onchange="togglePrincipalImage(${imagem.id}, this.checked)"
                                   class="mr-1">
                            Principal
                        </span>
                    </div>
                    ${imagem.legenda ? `<p class="text-sm text-gray-500">${imagem.legenda}</p>` : ''}
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="editImageCaption(${imagem.id}, '${imagem.legenda || ''}')" 
                        class="text-blue-600 hover:text-blue-800 p-2 rounded transition duration-200"
                        title="Editar legenda">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="updateImageOrder(${imagem.id}, ${imagem.ordem - 1})" 
                        ${imagem.ordem <= 1 ? 'disabled' : ''}
                        class="text-gray-600 hover:text-gray-800 p-2 rounded transition duration-200 ${imagem.ordem <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                        title="Mover para cima">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button onclick="updateImageOrder(${imagem.id}, ${imagem.ordem + 1})" 
                        class="text-gray-600 hover:text-gray-800 p-2 rounded transition duration-200"
                        title="Mover para baixo">
                    <i class="fas fa-arrow-down"></i>
                </button>
                <button onclick="deleteGalleryImage(${imagem.id})" 
                        class="text-red-600 hover:text-red-800 p-2 rounded transition duration-200"
                        title="Excluir imagem">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function uploadGalleryImages(productId) {
    const fileInput = document.getElementById('gallery-images');
    const files = fileInput.files;
    
    if (!files || files.length === 0) {
        showToast('❌ Selecione pelo menos uma imagem para upload', 'error');
        return;
    }

    if (files.length > 10) {
        showToast('❌ Máximo de 10 imagens por produto', 'error');
        return;
    }

    const btnUpload = document.getElementById('btn-upload-gallery');
    const originalText = btnUpload.innerHTML;
    
    try {
        btnUpload.disabled = true;
        btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';

        console.log(`📤 Iniciando upload de ${files.length} imagens para o produto ${productId}`);
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            
            formData.append('produto', parseInt(productId));
            formData.append('imagem', file);
            formData.append('ordem', (i + 1).toString());
            formData.append('legenda', '');
            formData.append('is_principal', 'false');

            const response = await fetch('/api/imagens-produto/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Erro na imagem ${i + 1}:`, errorText);
                throw new Error(`Imagem ${i + 1}: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`✅ Imagem ${i + 1} enviada:`, result);
        }

        showToast(`✅ ${files.length} imagem(ns) adicionada(s) à galeria!`, 'success');
        
        await loadProductGallery(productId);
        
        fileInput.value = '';
        btnUpload.textContent = 'Upload de Imagens';

    } catch (error) {
        console.error('❌ Erro no upload da galeria:', error);
        showToast(`❌ Erro ao enviar imagens: ${error.message}`, 'error');
    } finally {
        btnUpload.disabled = false;
        btnUpload.innerHTML = originalText;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

async function togglePrincipalImage(imageId, isPrincipal) {
    try {
        const response = await fetch(`/api/imagens-produto/${imageId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({
                is_principal: isPrincipal
            })
        });

        if (!response.ok) throw new Error('Erro ao atualizar imagem principal');

        const data = await response.json();
        console.log('✅ Imagem principal atualizada:', data);
        
        const productId = document.getElementById('product-form').dataset.productId;
        await loadProductGallery(productId);

    } catch (error) {
        console.error('❌ Erro ao definir imagem principal:', error);
        alert('Erro ao definir imagem principal');
    }
}

async function updateImageOrder(imageId, newOrder) {
    try {
        const response = await fetch(`/api/imagens-produto/${imageId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({
                ordem: newOrder
            })
        });

        if (!response.ok) throw new Error('Erro ao atualizar ordem');

        const data = await response.json();
        console.log('✅ Ordem da imagem atualizada:', data);
        
        const productId = document.getElementById('product-form').dataset.productId;
        await loadProductGallery(productId);

    } catch (error) {
        console.error('❌ Erro ao atualizar ordem:', error);
        alert('Erro ao atualizar ordem da imagem');
    }
}

async function editImageCaption(imageId, currentCaption) {
    const newCaption = prompt('Digite a nova legenda para a imagem:', currentCaption);
    
    if (newCaption === null) return;
    
    try {
        const response = await fetch(`/api/imagens-produto/${imageId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({
                legenda: newCaption
            })
        });

        if (!response.ok) throw new Error('Erro ao atualizar legenda');

        const data = await response.json();
        console.log('✅ Legenda atualizada:', data);
        
        const productId = document.getElementById('product-form').dataset.productId;
        await loadProductGallery(productId);

    } catch (error) {
        console.error('❌ Erro ao atualizar legenda:', error);
        alert('Erro ao atualizar legenda');
    }
}

async function deleteGalleryImage(imageId) {
    if (!confirm('Tem certeza que deseja excluir esta imagem da galeria?')) {
        return;
    }

    try {
        const response = await fetch(`/api/imagens-produto/${imageId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken(),
            }
        });

        if (!response.ok) throw new Error('Erro ao excluir imagem');

        console.log('✅ Imagem excluída com sucesso');
        
        const productId = document.getElementById('product-form').dataset.productId;
        await loadProductGallery(productId);

    } catch (error) {
        console.error('❌ Erro ao excluir imagem:', error);
        alert('Erro ao excluir imagem');
    }
}

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
        
        const produtoEscapado = JSON.stringify(produto)
            .replace(/'/g, "&#39;")
            .replace(/"/g, "&quot;");

        const statusIcon = produto.status === 'Ativo' ? 'fa-eye-slash' : 'fa-eye';
        const statusTitle = produto.status === 'Ativo' ? 'Inativar' : 'Ativar';
        const statusColor = produto.status === 'Ativo' ? 'orange' : 'green';

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
                    <button class="text-${statusColor}-600 hover:text-${statusColor}-900 toggle-status-product" 
                            data-product-id="${produto.id}" 
                            data-current-status="${produto.status}"
                            title="${statusTitle} Produto">
                        <i class="fas ${statusIcon}"></i>
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
            if (data) {
                const produto = JSON.parse(data.replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
                console.log('👁️ Abrindo modal para:', produto.nome);
                showProductModal(produto); // Agora usa o modal padrão
            }
        });
    });

    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = btn.getAttribute('data-product');
            if (data) editarProduto(JSON.parse(data.replace(/&#39;/g, "'").replace(/&quot;/g, '"')));
        });
    });

    document.querySelectorAll('.toggle-status-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-product-id');
            const currentStatus = btn.getAttribute('data-current-status');
            if (id) toggleProductStatus(id, currentStatus);
        });
    });
}

// ====================
// Filtro por Status
// ====================
function aplicarFiltros() {
    const statusFiltro = document.getElementById('status-filter')?.value || '';
    const termoBusca = document.getElementById('search-products')?.value.toLowerCase() || '';
    
    console.log(`🔍 Aplicando filtros - Status: "${statusFiltro}", Busca: "${termoBusca}"`);
    
    document.querySelectorAll('#all-products-table-body .product-row').forEach(row => {
        const nome = row.querySelector('.product-name')?.textContent.toLowerCase() || '';
        const categoria = row.querySelector('.product-category')?.textContent.toLowerCase() || '';
        const statusElement = row.querySelector('span');
        const status = statusElement ? statusElement.textContent.trim() : '';
        
        const matchBusca = !termoBusca || nome.includes(termoBusca) || categoria.includes(termoBusca);
        const matchStatus = !statusFiltro || status === statusFiltro;
        
        const shouldShow = matchBusca && matchStatus;
        row.style.display = shouldShow ? '' : 'none';
        
        console.log(`📦 Produto "${nome}" - Status: "${status}" - Mostrar: ${shouldShow}`);
    });
}

// ====================
// Configurar Filtros
// ====================
function setupStatusFilter() {
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('search-products');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', aplicarFiltros);
        console.log('✅ Filtro de status configurado');
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', aplicarFiltros);
        console.log('✅ Busca configurada');
    }
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
        
        const btn = document.querySelector('.btn-add-product');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-plus mr-2"></i> Adicionar Produto';
            delete btn.dataset.editingId;
        }
        
        const currentImageContainer = document.getElementById('current-image-container');
        if (currentImageContainer) currentImageContainer.classList.add('hidden');
        
        const gallerySection = document.getElementById('gallery-section');
        if (gallerySection) gallerySection.classList.add('hidden');
        
        const galleryList = document.getElementById('gallery-images-list');
        if (galleryList) {
            galleryList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-images text-4xl mb-2"></i>
                    <p>Nenhuma imagem na galeria</p>
                </div>
            `;
        }
        
        const galleryInput = document.getElementById('gallery-images');
        if (galleryInput) galleryInput.value = '';
        
        const formTitle = document.getElementById('product-form-title');
        if (formTitle) {
            formTitle.textContent = 'Adicionar Novo Produto';
        }
        
        currentEditingProduct = null;
        
        console.log('🔄 Formulário resetado para modo criação');
    }
}

// ====================
// Formulário
// ====================
function handleProductSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const isEdit = form.dataset.editMode === 'true';
    const id = form.dataset.productId;

    console.log('📦 Dados do formulário sendo enviados:');
    for (let [key, value] of formData.entries()) {
        console.log(`   ${key}: ${value}`);
    }

    const descricao = formData.get('product-descricao');
    if (descricao) {
        console.log('✅ Descrição com HTML permitida');
    }

    if (isEdit && !formData.get('imagem')) {
        formData.delete('imagem');
        console.log('🔄 Modo edição - removendo campo imagem vazio para manter imagem atual');
    }

    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;

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
// Alternar Status do Produto (Inativar/Ativar)
// ====================
function toggleProductStatus(productId, currentStatus) {
    const novoStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    const action = novoStatus === 'Inativo' ? 'inativar' : 'ativar';
    
    if (!confirm(`Tem certeza que deseja ${action} este produto?`)) return;
    
    fetch(`/api/produtos/${productId}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({ status: novoStatus })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    })
    .then(data => {
        console.log(`✅ Produto ${action}do com sucesso:`, data);
        alert(`✅ Produto ${action}do com sucesso!`);
        reloadProducts();
    })
    .catch(err => {
        console.error(`❌ Erro ao ${action} produto:`, err);
        alert(`❌ Erro ao ${action} produto: ${err.message || 'Tente novamente'}`);
    });
}

// ====================
// Ações de produto
// ====================
function editarProduto(produto) {
    console.log('🔄 Editando produto:', produto);
    
    currentEditingProduct = produto;
    
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

    const gallerySection = document.getElementById('gallery-section');
    if (gallerySection) {
        gallerySection.classList.remove('hidden');
        loadProductGallery(produto.id);
    }

    if (form) {
        form.dataset.editMode = 'true';
        form.dataset.productId = produto.id;
        console.log(`🎯 Modo edição ativado para produto ID: ${produto.id}`);
        
        const btn = document.querySelector('.btn-add-product');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-edit mr-2"></i> Editando Produto';
            btn.dataset.editingId = produto.id;
        }

        const formTitle = document.getElementById('product-form-title');
        if (formTitle) {
            formTitle.textContent = `Editando Produto: ${produto.nome}`;
        }
    }

    const btnUploadGallery = document.getElementById('btn-upload-gallery');
    if (btnUploadGallery) {
        btnUploadGallery.onclick = () => uploadGalleryImages(produto.id);
    }

    if (typeof toggleAddProductForm === 'function') {
        const formEl = document.getElementById('add-product-form');
        if (formEl && formEl.classList.contains('hidden')) {
            toggleAddProductForm();
        }
    }
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
        
        if (form.classList.contains('hidden')) {
            resetProductForm();
        }
    }
}

// ====================
// Adicionar CSS para animações (igual ao dos usuários)
// ====================
const productModalStyle = document.createElement('style');
productModalStyle.textContent = `
    .product-modal-backdrop {
        z-index: 100 !important;
    }
    
    .prose {
        color: #374151;
        line-height: 1.6;
    }
    
    .prose p {
        margin-top: 0.5em;
        margin-bottom: 0.5em;
    }
    
    .prose br {
        margin-bottom: 0.5em;
    }
    
    .close-modal-btn {
        cursor: pointer !important;
        z-index: 102 !important;
        position: relative !important;
    }
    
    /* ✅ GARANTIR QUE A SIDEBAR FIQUE ATRÁS DO MODAL */
    #sidebar {
        z-index: 40 !important;
    }
    
    #backdrop {
        z-index: 45 !important;
    }
`;
document.head.appendChild(productModalStyle);