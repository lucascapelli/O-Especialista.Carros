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
        const response = await fetch('http://localhost:8000/api/login/', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'  // Para ajudar com CORS
          },
          body: JSON.stringify({ 
            email: email,
            senha: senha  // Mantendo o nome do campo que seu backend espera
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          // Login bem-sucedido
          alert(data.message || 'Login realizado com sucesso!');
          
          // Armazena os dados do usuário
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Redireciona
          window.location.href = 'index.html';
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
});