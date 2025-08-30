document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.login-form');
  
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('email').value;
      const senha = document.getElementById('senha').value;

      // Validação básica no frontend
      if (!email || !senha) {
        alert('Email e senha são obrigatórios');
        return;
      }

      try {
        // ✅ CORRETO: Use URL relativa do Django
        const response = await fetch('/api/login/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()  // ✅ Adicione CSRF token
          },
          body: JSON.stringify({ 
            email: email,
            senha: senha
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          // Login bem-sucedido
          alert(data.message || 'Login realizado com sucesso!');
          
          // Armazena os dados do usuário
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // ✅ CORRETO: Redireciona para a URL nomeada do Django
          window.location.href = data.redirect_to || '/';  // Ou use a URL do name='index'
        } else {
          // Trata erros do backend
          alert(data.error || 'Credenciais inválidas');
        }
      } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
      }
    });
  }

  // ✅ Função para pegar o CSRF token (adicione esta função)
  function getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('csrftoken' + '=')) {
          cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
});