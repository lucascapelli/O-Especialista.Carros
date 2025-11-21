// produtos.js - Funções específicas para páginas de produtos

// Função para adicionar produto ao carrinho
async function adicionarAoCarrinho(produtoId) {
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
            showToast('✅ Produto adicionado ao carrinho!');
            atualizarContadorCarrinho();
        } else {
            showToast('❌ Erro ao adicionar produto', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('❌ Erro de conexão', 'error');
    }
}

// Event listeners para página de detalhes do produto
document.addEventListener('DOMContentLoaded', function() {
    // Botão comprar principal
    const btnComprarDetalhes = document.querySelector('.btn-comprar-detalhes');
    if (btnComprarDetalhes) {
        btnComprarDetalhes.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-produto-id');
            adicionarAoCarrinho(produtoId);
        });
    }

    // Botões comprar dos produtos relacionados
    const botoesRelacionados = document.querySelectorAll('.btn-comprar-relacionado');
    botoesRelacionados.forEach(botao => {
        botao.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-produto-id');
            adicionarAoCarrinho(produtoId);
        });
    });

    // Inicializar funções globais
    atualizarMenuUsuario();
    atualizarContadorCarrinho();
});

// Exportar função para uso global
window.adicionarAoCarrinho = adicionarAoCarrinho;
