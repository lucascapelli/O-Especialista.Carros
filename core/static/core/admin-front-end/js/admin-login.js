// Toggle password visibility
document.getElementById('toggle-password').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// Auto-hide error messages after 5 seconds
setTimeout(function() {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage && !errorMessage.classList.contains('hidden')) {
        errorMessage.classList.add('hidden');
    }
}, 5000);
