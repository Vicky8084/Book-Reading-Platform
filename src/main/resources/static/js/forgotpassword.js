document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const otpInputs = document.querySelectorAll('.otp-input');
  const verifyBtn = document.getElementById('verifyBtn');
  const resendOtp = document.getElementById('resendOtp');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const emailInput = document.getElementById('email');
  const alertContainer = document.getElementById('alertContainer');
  const loginForm = document.getElementById('loginForm');

  otpInputs.forEach(input => input.disabled = true);
  verifyBtn.disabled = true;
  resendOtp.classList.add('disabled');
  resendOtp.style.color = '#ccc';
  resendOtp.style.cursor = 'not-allowed';

  function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
      <i class="bx ${type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-error-circle' : 'bx-info-circle'}"></i>
      <span>${message}</span>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 5000);
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  sendOtpBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();

    if (!email) {
      showAlert('Please enter your email address', 'error');
      return;
    }
    if (!validateEmail(email)) {
      showAlert('Please enter a valid email address', 'error');
      return;
    }

    showAlert('Password reset via OTP is not available yet. Please contact support.', 'info');
  });

  resendOtp.addEventListener('click', (e) => {
    e.preventDefault();
  });
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.classList.toggle('bx-hide');
    togglePassword.classList.toggle('bx-show');
  });

  toggleConfirmPassword.addEventListener('click', () => {
    const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    confirmPasswordInput.setAttribute('type', type);
    toggleConfirmPassword.classList.toggle('bx-hide');
    toggleConfirmPassword.classList.toggle('bx-show');
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showAlert('Password reset is not available yet. Please contact support.', 'info');
  });
});