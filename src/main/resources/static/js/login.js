document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(option => {
        option.addEventListener('click', () => {
            roleOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            const radioInput = option.querySelector('input[type="radio"]');
            radioInput.checked = true;
        });
    });

    document.querySelector('.role-option[data-role="user"]').classList.add('selected');

    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.classList.toggle('bx-hide');
        togglePassword.classList.toggle('bx-show');
    });

    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showQuickMessage('Please fill in all fields', 'error');
            return;
        }

        const loginBtn = loginForm.querySelector('.login-btn');
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Signing In...';
        loginBtn.disabled = true;

        try {
            // ✅ Backend API call
            const response = await fetch('http://localhost:8081/api/v1/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // ✅ Store user data
                const userData = {
                    userId: data.userId,
                    name: data.userName,
                    email: data.email,
                    role: data.role,
                    age: data.age,
                    phoneNumber: data.phoneNumber
                };

                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('currentUserId', data.userId.toString());

                showQuickMessage('Login successful! Welcome back, ' + data.userName, 'success');

                setTimeout(() => {
                    // ✅ Role-based redirect
                    if (data.role === 'ADMIN') {
                        window.location.href = '/admin-dashboard';
                    } else if (data.role === 'PUBLISHER') {
                        window.location.href = '/publisher-dashboard';
                    } else {
                        window.location.href = '/bookscreen';
                    }
                }, 500);

            } else {
                showQuickMessage(data.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showQuickMessage('Network error. Please try again.', 'error');
        } finally {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    });
});

// ===== Helper Functions (Same rahenge) =====
function showQuickMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}
