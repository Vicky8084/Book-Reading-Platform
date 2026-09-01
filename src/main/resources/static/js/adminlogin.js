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

    const response = await fetch(`${window.location.origin}/api/v1/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password })
    });

    const data = await response.json();

    if (data.success && data.role === 'ADMIN') {
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

      window.location.href = '/admin-dashboard';
    } else if (data.success && data.role !== 'ADMIN') {
      showError('This account is not an admin account.');
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
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const userData = localStorage.getItem('user');
  if (isLoggedIn === 'true' && userData) {
    const user = JSON.parse(userData);
    if (user.role === 'ADMIN') {
      window.location.href = '/admin-dashboard';
    }
  }
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});