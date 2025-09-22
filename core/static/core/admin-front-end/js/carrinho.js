// Função para pegar o CSRFToken do cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');

// ---------------- Adicionar produto ----------------
async function adicionarCarrinho(produtoId) {
    const response = await fetch(`/adicionar-carrinho/${produtoId}/`, {
        method: "POST",
        headers: {
            "X-CSRFToken": csrftoken,
            "X-Requested-With": "XMLHttpRequest"
        }
    });

    const data = await response.json();

    if (data.success) {
        atualizarCarrinhoResumo();
    }
}

// ---------------- Remover produto ----------------
async function removerCarrinho(itemId) {
    const response = await fetch(`/remover-carrinho/${itemId}/`, {
        method: "POST",
        headers: {
            "X-CSRFToken": csrftoken,
            "X-Requested-With": "XMLHttpRequest"
        }
    });

    const data = await response.json();

    if (data.success) {
        atualizarCarrinhoResumo();
        // Também pode remover o item do DOM sem reload:
        document.getElementById(`item-${itemId}`).remove();
    }
}

// ---------------- Atualizar resumo ----------------
async function atualizarCarrinhoResumo() {
    const response = await fetch(`/carrinho-json/`);  // precisamos criar essa rota
    const data = await response.json();

    document.getElementById("subtotal").textContent = "R$ " + data.subtotal.toFixed(2);
    document.getElementById("frete").textContent = "R$ " + data.frete.toFixed(2);
    document.getElementById("total").textContent = "R$ " + data.total.toFixed(2);

    // Atualiza badge no ícone do carrinho
    document.getElementById("cart-count").textContent = data.total_itens;
}
