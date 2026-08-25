const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');
togglePassword.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  togglePassword.classList.toggle('bx-show');
});

async function validateAndLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');
  const errorMessage = document.getElementById('errorMessage');

  errorMessage.style.display = 'none';

  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError('Please enter a valid email address');
    return;
  }

  try {
    loginBtn.innerHTML = 'Logging in...';
    loginBtn.disabled = true;

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password })
    });

    const data = await response.json();

    if (data.success) {
      sessionStorage.setItem('admin', JSON.stringify(data.admin));
      sessionStorage.setItem('isAdmin', 'true');
      window.location.href = '/admin-dashboard';
    } else {
      showError(data.message || 'Invalid admin credentials');
    }
  } catch (error) {
    showError('Network error. Please check your connection and try again.');
  } finally {
    loginBtn.innerHTML = 'Login';
    loginBtn.disabled = false;
  }
}

function showError(message) {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

document.getElementById('adminForm').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    validateAndLogin();
  }
});

window.addEventListener('load', function() {
  const isAdmin = sessionStorage.getItem('isAdmin');
  if (isAdmin) {
    window.location.href = '/admin-dashboard';
  }
});