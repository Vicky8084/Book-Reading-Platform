document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const otpInputs = document.querySelectorAll('.otp-input');
  const otpHidden = document.getElementById('otp');
  const verifyBtn = document.getElementById('verifyBtn');
  const verifyStatus = document.getElementById('verifyStatus');
  const resendOtp = document.getElementById('resendOtp');
  const timerEl = document.getElementById('timer');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const emailInput = document.getElementById('email');
  const alertContainer = document.getElementById('alertContainer');
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const submitBtn = loginForm.querySelector('.login-btn');

  const OTP_SECONDS = 120; // 2 min - backend OTP_TTL ke saath match
  let timerInterval = null;
  let otpVerified = false;

  setOtpEnabled(false);
  verifyBtn.disabled = true;
  resendOtp.classList.add('disabled');
  submitBtn.disabled = true;
  passwordInput.disabled = true;
  confirmPasswordInput.disabled = true;

  function setOtpEnabled(enabled) {
    otpInputs.forEach(input => (input.disabled = !enabled));
    verifyBtn.disabled = !enabled;
  }

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
      if (alertDiv.parentNode) alertDiv.remove();
    }, 5000);
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function collectOtp() {
    const value = Array.from(otpInputs).map(i => i.value.trim()).join('');
    otpHidden.value = value;
    return value;
  }

  function startTimer() {
    clearInterval(timerInterval);
    let remaining = OTP_SECONDS;
    resendOtp.classList.add('disabled');
    updateTimerDisplay(remaining);

    timerInterval = setInterval(() => {
      remaining--;
      updateTimerDisplay(remaining);
      if (remaining <= 0) {
        clearInterval(timerInterval);
        resendOtp.classList.remove('disabled');
        timerEl.textContent = '';
      }
    }, 1000);
  }

  function updateTimerDisplay(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    timerEl.textContent = `(${m}:${s})`;
  }

  async function requestOtp() {
    const email = emailInput.value.trim();

    if (!email) {
      showAlert('Please enter your email address', 'error');
      return;
    }
    if (!validateEmail(email)) {
      showAlert('Please enter a valid email address', 'error');
      return;
    }

    sendOtpBtn.disabled = true;
    try {
      const response = await fetch('/api/v1/password/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const message = await response.text();

      if (!response.ok) {
        showAlert(message || 'Something went wrong. Please try again.', 'error');
        return;
      }

      showAlert(message, 'success');
      emailInput.disabled = true;
      otpInputs.forEach(i => (i.value = ''));
      setOtpEnabled(true);
      otpInputs[0].focus();
      startTimer();
    } catch (err) {
      showAlert('Network error. Please try again.', 'error');
    } finally {
      sendOtpBtn.disabled = false;
    }
  }

  sendOtpBtn.addEventListener('click', requestOtp);

  resendOtp.addEventListener('click', (e) => {
    e.preventDefault();
    if (resendOtp.classList.contains('disabled')) return;
    requestOtp();
  });

  otpInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
      collectOtp();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });

  verifyBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const otp = collectOtp();

    if (otp.length < 4) {
      showAlert('Please enter the complete 4-digit OTP', 'error');
      return;
    }

    verifyBtn.disabled = true;
    try {
      const response = await fetch('/api/v1/password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const message = await response.text();

      if (!response.ok) {
        verifyStatus.textContent = message || 'Invalid OTP';
        verifyStatus.style.color = 'red';
        showAlert(message || 'Invalid OTP', 'error');
        verifyBtn.disabled = false;
        return;
      }

      otpVerified = true;
      verifyStatus.textContent = '✔ Verified';
      verifyStatus.style.color = 'green';
      showAlert(message, 'success');

      clearInterval(timerInterval);
      otpInputs.forEach(i => (i.disabled = true));
      passwordInput.disabled = false;
      confirmPasswordInput.disabled = false;
      submitBtn.disabled = false;
      passwordInput.focus();
    } catch (err) {
      showAlert('Network error. Please try again.', 'error');
      verifyBtn.disabled = false;
    }
  });

  const togglePassword = document.getElementById('togglePassword');
  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

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

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!otpVerified) {
      showAlert('Please verify OTP first', 'error');
      return;
    }

    const email = emailInput.value.trim();
    const otp = collectOtp();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password.length < 8) {
      showAlert('Password should be at least 8 characters', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Passwords do not match', 'error');
      return;
    }

    submitBtn.disabled = true;
    try {
      const response = await fetch('/api/v1/password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password, confirmPassword })
      });
      const message = await response.text();

      if (!response.ok) {
        showAlert(message || 'Something went wrong. Please try again.', 'error');
        submitBtn.disabled = false;
        return;
      }

      showAlert(message, 'success');
      setTimeout(() => (window.location.href = '/login'), 1500);
    } catch (err) {
      showAlert('Network error. Please try again.', 'error');
      submitBtn.disabled = false;
    }
  });
});