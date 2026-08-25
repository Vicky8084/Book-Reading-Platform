document.addEventListener('DOMContentLoaded', () => {
  // Set current year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // OTP Verification Logic
  const otpContainer = document.querySelector('.otp-container');
  const otpInputs = document.querySelectorAll('.otp-input');
  const hiddenOtp = document.getElementById('otp');
  const verifyBtn = document.getElementById('verifyBtn');
  const verifyStatus = document.getElementById('verifyStatus');
  const resendOtp = document.getElementById('resendOtp');
  const timer = document.getElementById('timer');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const emailInput = document.getElementById('email');
  const alertContainer = document.getElementById('alertContainer');

  let generatedOtp = '';
  let countdown = 120; // 2 minutes in seconds
  let timerInterval;

  // Initially disable OTP inputs and verify button
  otpInputs.forEach(input => input.disabled = true);
  verifyBtn.disabled = true;
  resendOtp.classList.add('disabled');
  resendOtp.style.color = '#ccc';
  resendOtp.style.cursor = 'not-allowed';

  // Show alert function
  function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
      <i class="bx ${type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-error-circle' : 'bx-info-circle'}"></i>
      <span>${message}</span>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 5000);
  }

  // Send OTP button functionality
  sendOtpBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    if (!email) {
      showAlert('Please enter your email address', 'error');
      return;
    }

    if (!validateEmail(email)) {
      showAlert('Please enter a valid email address', 'error');
      return;
    }

    // Show loading state
    sendOtpBtn.innerHTML = '<div class="spinner"></div> Sending...';
    sendOtpBtn.disabled = true;
    sendOtpBtn.classList.add('btn-loading');

    try {
      // Call backend to send OTP
      const response = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok) {
        showAlert('OTP sent to your email address', 'success');

        // Enable OTP inputs and verify button
        otpInputs.forEach(input => input.disabled = false);
        verifyBtn.disabled = false;

        // Focus the first OTP input
        otpInputs[0].focus();

        sendOtpBtn.textContent = 'OTP Sent';

        // Start the timer
        startTimer();
      } else {
        showAlert(result.message || 'Failed to send OTP', 'error');
        sendOtpBtn.textContent = 'Send OTP';
        sendOtpBtn.disabled = false;
        sendOtpBtn.classList.remove('btn-loading');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      showAlert('Failed to send OTP. Please try again.', 'error');
      sendOtpBtn.textContent = 'Send OTP';
      sendOtpBtn.disabled = false;
      sendOtpBtn.classList.remove('btn-loading');
    }
  });

  // Start the timer
  function startTimer() {
    countdown = 120;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      countdown--;
      updateTimerDisplay();

      if (countdown <= 0) {
        clearInterval(timerInterval);
        timer.textContent = '';
        resendOtp.classList.remove('disabled');
        resendOtp.style.color = '#667eea';
        resendOtp.style.cursor = 'pointer';
      }
    }, 1000);
  }

  // Add event listeners to OTP inputs
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 1);
      e.target.value = value;

      if (value) {
        // Add filled class for styling
        input.classList.add('filled');

        // Move to next input if available
        if (index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      } else {
        input.classList.remove('filled');
      }

      updateHiddenOtp();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!e.target.value && index > 0) {
          // If current input is empty and backspace is pressed, focus previous input
          otpInputs[index - 1].focus();
        } else if (e.target.value) {
          // If current input has value, clear it
          e.target.value = '';
          input.classList.remove('filled');
          updateHiddenOtp();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        otpInputs[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');

      if (!pasteData) return;

      const digits = pasteData.slice(0, otpInputs.length).split('');

      otpInputs.forEach((input, i) => {
        if (digits[i]) {
          input.value = digits[i];
          input.classList.add('filled');
        } else {
          input.value = '';
          input.classList.remove('filled');
        }
      });

      // Focus the last filled input or the last input
      const lastFilledIndex = Math.min(digits.length, otpInputs.length) - 1;
      otpInputs[lastFilledIndex].focus();

      updateHiddenOtp();
    });
  });

  // Update the hidden OTP field
  function updateHiddenOtp() {
    hiddenOtp.value = Array.from(otpInputs).map(input => input.value || '').join('');
    verifyStatus.textContent = ''; // Clear previous status when editing

    // Remove error styling when user starts typing again
    otpInputs.forEach(input => input.classList.remove('error'));
  }

  // Verify OTP
  verifyBtn.addEventListener('click', async () => {
    const enteredOtp = hiddenOtp.value;

    if (enteredOtp.length !== 4) {
      showError('Please enter all 4 digits');
      return;
    }

    const email = emailInput.value.trim();

    try {
      // Call backend to verify OTP
      const response = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: enteredOtp,
          email: email
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Show success
        verifyStatus.innerHTML = '<i class="bx bx-check-circle" style="color:#28a745; font-size:24px;"></i>';
        verifyStatus.setAttribute('aria-label', 'OTP verified successfully');

        // Disable inputs and button
        otpInputs.forEach(input => {
          input.disabled = true;
          input.classList.add('filled');
        });
        verifyBtn.disabled = true;

        // Clear timer
        clearInterval(timerInterval);
        timer.textContent = '';

        showAlert('OTP verified successfully', 'success');
      } else {
        // Show error with red cross icon
        verifyStatus.innerHTML = '<i class="bx bx-x-circle" style="color:#ff4757; font-size:24px;"></i>';
        verifyStatus.setAttribute('aria-label', 'Invalid OTP');

        // Add error styling to inputs
        otpInputs.forEach(input => {
          input.classList.add('error');
        });

        // Shake animation for error
        otpContainer.classList.add('shake');
        setTimeout(() => {
          otpContainer.classList.remove('shake');
        }, 500);

        showAlert(result.message || 'Invalid OTP', 'error');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      showAlert('Failed to verify OTP. Please try again.', 'error');
    }
  });

  // Show error message and styling
  function showError(message) {
    otpInputs.forEach(input => {
      input.classList.add('error');
    });

    // Show red cross icon with error message as tooltip
    verifyStatus.innerHTML = '<i class="bx bx-x-circle" style="color:#ff4757; font-size:24px;"></i>';
    verifyStatus.setAttribute('aria-label', message);

    // Shake animation for error
    otpContainer.classList.add('shake');
    setTimeout(() => {
      otpContainer.classList.remove('shake');
    }, 500);
  }

  // Resend OTP functionality
  resendOtp.addEventListener('click', async () => {
    if (resendOtp.classList.contains('disabled')) return;

    const email = emailInput.value.trim();
    if (!email) {
      showAlert('Please enter your email first', 'error');
      return;
    }

    // Show loading state
    resendOtp.innerHTML = '<div class="spinner"></div> Resending...';
    resendOtp.style.cursor = 'not-allowed';

    try {
      // Call backend to resend OTP
      const response = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (response.ok) {
        showAlert('New OTP sent to your email address', 'success');

        // Reset OTP inputs
        otpInputs.forEach(input => {
          input.value = '';
          input.disabled = false;
          input.classList.remove('filled', 'error');
        });

        // Reset verification status
        verifyStatus.textContent = '';
        verifyBtn.disabled = false;

        // Focus first input
        otpInputs[0].focus();

        // Reset and restart timer
        clearInterval(timerInterval);
        countdown = 120;
        startTimer();

        // Disable resend button temporarily
        resendOtp.classList.add('disabled');
        resendOtp.style.color = '#ccc';
        resendOtp.style.cursor = 'not-allowed';
        resendOtp.textContent = 'Resend OTP';

        // Re-enable after 30 seconds
        setTimeout(() => {
          resendOtp.classList.remove('disabled');
          resendOtp.style.color = '#667eea';
          resendOtp.style.cursor = 'pointer';
        }, 30000);
      } else {
        showAlert(result.message || 'Failed to resend OTP', 'error');
        resendOtp.textContent = 'Resend OTP';
        resendOtp.style.cursor = 'pointer';
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      showAlert('Failed to resend OTP. Please try again.', 'error');
      resendOtp.textContent = 'Resend OTP';
      resendOtp.style.cursor = 'pointer';
    }
  });

  // Timer function
  function updateTimerDisplay() {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    timer.textContent = `(${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')})`;
  }

  // Email validation function
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // ===== Password Toggle Visibility =====
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

  // ===== Form Submission =====
  const loginForm = document.getElementById('loginForm');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const otp = document.getElementById('otp').value;

    // Basic validation
    if (!email || !password || !confirmPassword || !otp) {
      showAlert('Please fill in all fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Passwords do not match', 'error');
      return;
    }

    if (otp.length !== 4) {
      showAlert('Please enter a valid 4-digit OTP', 'error');
      return;
    }

    // Show loading state
    const submitBtn = loginForm.querySelector('.login-btn');
    submitBtn.innerHTML = '<div class="spinner"></div> Resetting...';
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');

    try {
      // Call backend to reset password
      const response = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword: password,
          token: otp
        })
      });

      const result = await response.json();

      if (response.ok) {
        showAlert('Password reset successfully! Redirecting to login...', 'success');

        // Redirect to login page after delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        showAlert(result.message || 'Failed to reset password', 'error');
        submitBtn.textContent = 'R e s e t';
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-loading');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      showAlert('Failed to reset password. Please try again.', 'error');
      submitBtn.textContent = 'R e s e t';
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
    }
  });
});