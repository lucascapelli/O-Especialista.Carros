console.log('🚀 register.js INICIADO - arquivo carregado');
console.log('📋 Verificando DOM...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM totalmente carregado');    const form = document.getElementById('registerForm');
    if (!form) return;

    const loginUrl = form.dataset.loginUrl; // Pega do atributo data-login-url

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            password: document.getElementById('password').value,
            password2: document.getElementById('password2').value
        };

        // Validações básicas
        if (!formData.fullName) return alert('Informe seu nome completo');
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) return alert('E-mail inválido');
        if (formData.password.length < 8) return alert('Senha deve ter pelo menos 8 caracteres');
        if (formData.password !== formData.password2) return alert('As senhas não coincidem');

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
            console.log('Enviando requisição para /api/register/ com payload:', payload);
            const response = await fetch('/api/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify(payload)
            });

            console.log('Resposta recebida:', response);
            const data = await response.json();
            console.log('Dados da resposta:', data);

            if (response.ok) {
                console.log('=== DEBUG DETALHADO ===');
                console.log('Resposta completa:', data);
                console.log('data.redirect_to:', data.redirect_to);
                console.log('loginUrl:', loginUrl);
                console.log('Tipo data.redirect_to:', typeof data.redirect_to);
                console.log('Tipo loginUrl:', typeof loginUrl);

                // Mostra o que seria redirecionado
                const redirectTarget = data.redirect_to || loginUrl;
                console.log('Iria redirecionar para:', redirectTarget);

                // PARA TESTE: Force redirecionamento correto
                console.log('Forçando redirecionamento para /login/');
                window.location.href = '/login/';
            } else {
                if (data.details) {
                    const errorMessages = Object.entries(data.details)
                        .map(([field, errors]) => `${field}: ${errors}`)
                        .join('\n');
                    alert(`Erros no formulário:\n${errorMessages}`);
                } else {
                    alert(data.error || 'Erro ao processar cadastro');
                }
            }
        } catch (err) {
            console.error('Erro na requisição:', err);
            alert('Erro de conexão com o servidor.');
        }
    });
});