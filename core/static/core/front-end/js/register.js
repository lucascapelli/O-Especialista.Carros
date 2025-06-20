document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // Coleta dos dados com validação
            const formData = {
                fullName: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                password: document.getElementById('password').value,
                password2: document.getElementById('password2').value
            };

            // Validações frontend
            if (!formData.fullName) {
                alert('Por favor, informe seu nome completo');
                return;
            }

            if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
                alert('Por favor, insira um e-mail válido');
                return;
            }

            if (formData.password.length < 8) {
                alert('A senha deve ter pelo menos 8 caracteres');
                return;
            }

            if (formData.password !== formData.password2) {
                alert('As senhas não coincidem');
                return;
            }

            // Dividir nome completo
            const nameParts = formData.fullName.split(' ');
            const payload = {
                email: formData.email,
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                password: formData.password,
                password2: formData.password2,
                phone: formData.phone || null
            };

            try {
                const response = await fetch('http://localhost:8000/api/register/', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                
                if (response.ok) {
                    alert('Cadastro realizado com sucesso!');
                    window.location.href = 'login.html';
                } else {
                    // Tratamento de erros do backend
                    if (data.details) {
                        const errorMessages = Object.entries(data.details)
                            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(' ') : errors}`)
                            .join('\n');
                        alert(`Erros no formulário:\n${errorMessages}`);
                    } else {
                        alert(data.error || 'Erro ao processar cadastro');
                    }
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro de conexão com o servidor. Tente novamente.');
            }
        });
    }
});
console.log('Register form initialized');
console.log('Form element:', document.getElementById('registerForm'));
console.log('Input elements:', {
    fullName: document.getElementById('fullName'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    password2: document.getElementById('password2')
});