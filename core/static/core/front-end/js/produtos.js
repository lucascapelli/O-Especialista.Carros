// produtos.js - Funções específicas para páginas de produtos

// Função para adicionar produto ao carrinho
async function adicionarAoCarrinho(produtoId, quantidade = 1) {
    try {
        const response = await fetch(`/adicionar_carrinho/${produtoId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ ${quantidade} produto(s) adicionado(s) ao carrinho!`);
            atualizarContadorCarrinho();
        } else {
            showToast('❌ Erro ao adicionar produto', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro de conexão', 'error');
    }
}

// Função para adicionar e redirecionar para o carrinho
async function adicionarAoCarrinhoERedirecionar(produtoId, quantidade = 1) {
    try {
        const response = await fetch(`/adicionar_carrinho/${produtoId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('✅ Produto adicionado! Redirecionando...');
            setTimeout(() => {
                window.location.href = '/carrinho/';
            }, 1000);
        } else {
            showToast('❌ Erro ao adicionar produto', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro de conexão', 'error');
    }
}

// Controles de quantidade
function incrementQuantity() {
    const quantityInput = document.getElementById('quantity');
    let currentValue = parseInt(quantityInput.value);
    if (currentValue < 10) {
        quantityInput.value = currentValue + 1;
    }
}

function decrementQuantity() {
    const quantityInput = document.getElementById('quantity');
    let currentValue = parseInt(quantityInput.value);
    if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
    }
}

// Event listeners para página de detalhes do produto
document.addEventListener('DOMContentLoaded', function() {
    // Botão "Adicionar ao Carrinho"
    const btnAdicionarCarrinho = document.querySelector('.btn-adicionar-carrinho');
    if (btnAdicionarCarrinho) {
        btnAdicionarCarrinho.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-produto-id');
            const quantidade = document.getElementById('quantity').value;
            adicionarAoCarrinho(produtoId, quantidade);
        });
    }

    // Botão "Comprar Agora" - redireciona para o carrinho
    const btnComprarAgora = document.querySelector('.btn-comprar-agora');
    if (btnComprarAgora) {
        btnComprarAgora.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-produto-id');
            const quantidade = document.getElementById('quantity').value;
            adicionarAoCarrinhoERedirecionar(produtoId, quantidade);
        });
    }

    // Botões de quantidade
    const btnAumentar = document.querySelector('.btn-aumentar');
    if (btnAumentar) {
        btnAumentar.addEventListener('click', incrementQuantity);
    }

    const btnDiminuir = document.querySelector('.btn-diminuir');
    if (btnDiminuir) {
        btnDiminuir.addEventListener('click', decrementQuantity);
    }

    // Botões comprar dos produtos relacionados
    const botoesRelacionados = document.querySelectorAll('.btn-comprar-relacionado');
    botoesRelacionados.forEach(botao => {
        botao.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-produto-id');
            adicionarAoCarrinho(produtoId, 1);
        });
    });

    // Inicializar funções globais
    atualizarMenuUsuario();
    atualizarContadorCarrinho();
});

// Exportar funções para uso global
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.adicionarAoCarrinhoERedirecionar = adicionarAoCarrinhoERedirecionar;