document.addEventListener('DOMContentLoaded', function() {
    fetchProdutos();

    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', handleProductSubmit);
    }
});

// Buscar e listar produtos na tabela
async function fetchProdutos() {
    try {
        const response = await fetch('/api/produtos/');
        if (!response.ok) throw new Error('Erro ao buscar produtos');

        const produtos = await response.json();
        const tbody = document.getElementById('product-table-body');
        tbody.innerHTML = '';

        produtos.forEach(produto => {
            const statusClass = produto.status.toLowerCase() === 'ativo'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800';

            const row = `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10">
                                <img class="h-10 w-10 rounded" src="${produto.imagem || 'https://via.placeholder.com/40'}" alt="${produto.nome}">
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${produto.nome}</div>
                                <div class="text-sm text-gray-500">SKU: ${produto.sku || 'N/A'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${produto.categoria}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ ${produto.preco.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${produto.estoque}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${produto.status}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="alert('Ver ${produto.nome}')"><i class="fas fa-eye"></i></button>
                        <button class="text-yellow-600 hover:text-yellow-900 mr-3" onclick="alert('Editar ${produto.nome}')"><i class="fas fa-edit"></i></button>
                        <button class="text-red-600 hover:text-red-900" onclick="alert('Excluir ${produto.nome}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Pega o CSRF token do Django
function getCSRFToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : '';
}

// Lida com o envio do formulário de produto (incluindo imagem)
function handleProductSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const csrfToken = getCSRFToken();

fetch('http://127.0.0.1:8000/api/produtos/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken
        },
        body: formData,
        credentials: 'include'  // <<< importante para enviar cookie CSRF
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao salvar produto');
        }
        return response.json();
    })
    .then(data => {
        alert('Produto cadastrado com sucesso!');
        toggleAddProductForm();
        fetchProdutos();
    })
    .catch(error => {
        console.error('Erro ao cadastrar produto:', error);
        alert('Erro ao cadastrar produto.');
    });
}

function getCSRFToken() {
    const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
    return csrfToken ? csrfToken.value : '';
}
