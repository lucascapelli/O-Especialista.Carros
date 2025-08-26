document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');

    // Função para pegar o cookie pelo nome (útil para pegar csrftoken)
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for(let i = 0; i < cookies.length; i++) {
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

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = {
                fullName: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                password: document.getElementById('password').value,
                password2: document.getElementById('password2').value
            };

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
                const response = await fetch('/api/register/', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': csrftoken // << Aqui envia o token CSRF
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Cadastro realizado com sucesso!');
                    window.location.href = document.getElementById('registerForm').getAttribute
                } 
                
                else {
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
