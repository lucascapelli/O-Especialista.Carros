document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.login-form');
  
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('email').value;
      const senha = document.getElementById('senha').value;

      // Limpa erros anteriores
      clearErrors();

      // Validação básica no frontend
      if (!email || !senha) {
        showError('Email e senha são obrigatórios');
        return;
      }

      try {
        const response = await fetch('/api/login/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()
          },
          body: JSON.stringify({ 
            email: email,
            senha: senha
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          alert(data.message || 'Login realizado com sucesso!');
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = data.redirect_to || '/';
        } else {
          // Tratamento específico para conta desativada
          if (data.error && data.error.includes('desativada')) {
            showError(data.error, 'account-disabled');
          } else {
            showError(data.error || 'Credenciais inválidas');
          }
        }
      } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao conectar com o servidor');
      }
    });
  }

  function getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('csrftoken=')) {
          cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  // Função para mostrar erros personalizados
  function showError(message, errorType = '') {
    // Remove erros anteriores
    clearErrors();

    // Cria elemento de erro
    const errorDiv = document.createElement('div');
    errorDiv.className = `error-message ${errorType}`;
    errorDiv.textContent = message;

    // Insere antes do formulário
    form.parentNode.insertBefore(errorDiv, form);

    // Destaca campos inválidos
    if (!message.includes('desativada')) {
      highlightInvalidFields();
    }
  }

  function clearErrors() {
    // Remove mensagens de erro
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    
    // Remove destaque de campos
    document.querySelectorAll('.input-invalid').forEach(field => {
      field.classList.remove('input-invalid');
    });
  }

  function highlightInvalidFields() {
    const email = document.getElementById('email');
    const senha = document.getElementById('senha');

    if (!email.value) email.classList.add('input-invalid');
    if (!senha.value) senha.classList.add('input-invalid');
  }
});