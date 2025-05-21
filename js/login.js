// login.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
      const response = await fetch('/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Login realizado! Bem-vindo, ' + data.first_name);
        // Redirecione para outra página, se quiser
        // window.location.href = 'index.html';
      } else {
        const errorData = await response.json();
        alert('Erro: ' + (errorData.error || 'Credenciais inválidas'));
      }
    } catch (error) {
      alert('Erro na conexão com o servidor.');
      console.error('Erro:', error);
    }
  });
});
