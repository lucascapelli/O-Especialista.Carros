// static/core/front-end/js/esqueceu_senha.js

document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const forgotForm = document.querySelector('.forgot-form');
    const successMessage = document.getElementById('success-message');
    const submitButton = forgotForm?.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent || 'Enviar Instruções';

    // Inicialmente esconde a mensagem de sucesso
    if (successMessage) {
        successMessage.style.display = 'none';
    }

    // Se o formulário existir, adiciona o event listener
    if (forgotForm) {
        forgotForm.addEventListener('submit', handleForgotPassword);
    }

    async function handleForgotPassword(event) {
        event.preventDefault();
        
        // Desabilita o botão para evitar múltiplos envios
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
            submitButton.classList.add('opacity-50', 'cursor-not-allowed');
        }

        const formData = new FormData(forgotForm);
        const email = formData.get('email');

        // Validação básica do email
        if (!isValidEmail(email)) {
            showError('Por favor, insira um email válido.');
            resetButton();
            return;
        }

        try {
            const response = await fetch('/api/esqueceu-senha/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

            if (data.success) {
                showSuccess(data.message);
            } else {
                showError(data.error || 'Ocorreu um erro. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            showError('Erro de conexão. Verifique sua internet e tente novamente.');
        } finally {
            resetButton();
        }
    }

    function showSuccess(message) {
        // Esconde o formulário
        if (forgotForm) {
            forgotForm.style.display = 'none';
        }
        
        // Mostra a mensagem de sucesso
        if (successMessage) {
            const messageText = successMessage.querySelector('span');
            if (messageText) {
                messageText.textContent = message;
            }
            successMessage.style.display = 'block';
            successMessage.classList.add('show');
        }
        
        // Adiciona efeito visual
        addSuccessAnimation();
    }

    function showError(message) {
        // Remove mensagens de erro existentes
        removeExistingErrors();
        
        // Cria mensagem de erro
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4';
        errorDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Insere antes do formulário
        if (forgotForm) {
            forgotForm.parentNode.insertBefore(errorDiv, forgotForm);
        }
        
        // Adiciona efeito de shake no formulário
        addShakeAnimation();
    }

    function removeExistingErrors() {
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
    }

    function addShakeAnimation() {
        if (forgotForm) {
            forgotForm.classList.add('shake-animation');
            setTimeout(() => {
                forgotForm.classList.remove('shake-animation');
            }, 500);
        }
    }

    function addSuccessAnimation() {
        if (successMessage) {
            successMessage.classList.add('success-animation');
        }
    }

    function resetButton() {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function getCSRFToken() {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        return csrfToken ? csrfToken.value : '';
    }

    // Adiciona estilos CSS dinamicamente para as animações
    addCustomStyles();
});

function addCustomStyles() {
    const styles = `
        .shake-animation {
            animation: shake 0.5s ease-in-out;
        }
        
        .success-animation {
            animation: fadeInUp 0.6s ease-out;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .error-message {
            animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .success-message {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            color: #0369a1;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .success-message i {
            color: #10b981;
        }
        
        /* Loading animation */
        .fa-spinner {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}