// Backend Base URL
const BACKEND_BASE_URL = window.location.origin;

// DOM Elements
const form = document.getElementById('signupForm');
const fullName = document.getElementById('fullName');
const email = document.getElementById('email');
const phoneNumber = document.getElementById('phoneNumber');
const age = document.getElementById('age');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const terms = document.getElementById('terms');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
const roleOptions = document.querySelectorAll('.role-option');

// ===== CUSTOM STYLED ALERT (replaces native alert()) =====
const customAlertOverlay = document.getElementById('customAlertOverlay');
const customAlertIcon = document.getElementById('customAlertIcon');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOkBtn = document.getElementById('customAlertOkBtn');

function showAlert(message, type = 'success', onClose) {
  customAlertMessage.textContent = message;
  customAlertIcon.className = `custom-alert-icon ${type}`;
  customAlertIcon.innerHTML = type === 'success'
    ? "<i class='bx bx-check-circle'></i>"
    : "<i class='bx bx-x-circle'></i>";

  customAlertOverlay.classList.add('show');

  const closeHandler = () => {
    customAlertOverlay.classList.remove('show');
    customAlertOkBtn.removeEventListener('click', closeHandler);
    if (typeof onClose === 'function') onClose();
  };

  customAlertOkBtn.addEventListener('click', closeHandler);
}

// ===== ROLE SELECTION =====
roleOptions.forEach(option => {
  option.addEventListener('click', () => {
    roleOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    const radioInput = option.querySelector('input[type="radio"]');
    radioInput.checked = true;
  });
});

// Default select USER role
document.querySelector('.role-option[data-role="USER"]').classList.add('selected');

// ===== PASSWORD VISIBILITY TOGGLE =====
togglePassword.addEventListener('click', () => {
  const type = password.type === 'password' ? 'text' : 'password';
  password.type = type;
  togglePassword.classList.toggle('bx-hide');
  togglePassword.classList.toggle('bx-show');
});

toggleConfirmPassword.addEventListener('click', () => {
  const type = confirmPassword.type === 'password' ? 'text' : 'password';
  confirmPassword.type = type;
  toggleConfirmPassword.classList.toggle('bx-hide');
  toggleConfirmPassword.classList.toggle('bx-show');
});

// ===== PASSWORD STRENGTH CHECK =====
function isStrongPassword(pwd) {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return strongRegex.test(pwd);
}

// ===== FORM VALIDATION =====
function validateForm() {
  let valid = true;
  let errorMessage = '';

  if (!fullName.value.trim()) {
    errorMessage = 'Full name is required.';
    valid = false;
  } else if (!email.value.trim()) {
    errorMessage = 'Email is required.';
    valid = false;
  } else if (!phoneNumber.value.trim()) {
    errorMessage = 'Phone number is required.';
    valid = false;
  } else if (!age.value.trim() || Number(age.value) < 13 || Number(age.value) > 100) {
    errorMessage = 'Age must be between 13 and 100.';
    valid = false;
  } else if (!document.querySelector('input[name="role"]:checked')) {
    errorMessage = 'Please select a role (User or Publisher).';
    valid = false;
  } else if (!password.value.trim()) {
    errorMessage = 'Password is required.';
    valid = false;
  } else if (!isStrongPassword(password.value)) {
    errorMessage = 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special symbol (!@#$%^&*).';
    valid = false;
  } else if (password.value !== confirmPassword.value) {
    errorMessage = 'Passwords do not match. Please make sure both passwords are the same.';
    valid = false;
  } else if (!terms.checked) {
    errorMessage = 'You must agree to the Terms & Conditions.';
    valid = false;
  }

  if (!valid) {
    showAlert(errorMessage, 'error');
    return false;
  }
  return true;
}

// ===== LOADING STATE =====
function setLoadingState(loading) {
  const submitBtn = form.querySelector('.signup-btn');
  if (loading) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.style.opacity = '0.7';
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign Up';
    submitBtn.style.opacity = '1';
  }
}

// ===== FORM SUBMISSION =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoadingState(true);

  try {
    const selectedRole = document.querySelector('input[name="role"]:checked').value;

    const userData = {
      name: fullName.value.trim(),
      email: email.value.trim(),
      phoneNumber: phoneNumber.value.trim(),
      age: Number(age.value),
      password: password.value,
      role: selectedRole
    };

    console.log('🔄 Sending signup request to:', `${BACKEND_BASE_URL}/api/v1/user/register`);
    console.log('User Data:', userData);

    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    console.log('📨 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('📨 Server response:', result);

      const resetForm = () => {
        form.reset();
        roleOptions.forEach(opt => opt.classList.remove('selected'));
        document.querySelector('.role-option[data-role="USER"]').classList.add('selected');
      };

      if (selectedRole === 'PUBLISHER') {
        showAlert('Publisher account created successfully! Please wait for Admin approval.', 'success', resetForm);
      } else {
        showAlert('User account created successfully! Redirecting to login...', 'success', () => {
          resetForm();
          window.location.href = '/login';
        });
      }

    } else {
      const errorText = await response.text();
      console.error('❌ Server error response:', errorText);
      showAlert(errorText || 'Signup failed. Please try again.', 'error');
    }

  } catch (error) {
    console.error('💥 Signup error:', error);
    showAlert(`Error: ${error.message}`, 'error');
  } finally {
    setLoadingState(false);
  }
});

// ===== REAL-TIME VALIDATION =====
password.addEventListener('input', function() {
  if (this.value.length > 0 && !isStrongPassword(this.value)) {
    this.style.borderColor = 'orange';
  } else {
    this.style.borderColor = '';
  }
});

confirmPassword.addEventListener('input', function() {
  if (this.value.length > 0) {
    if (password.value === this.value) {
      this.style.borderColor = 'green';
    } else {
      this.style.borderColor = 'red';
    }
  } else {
    this.style.borderColor = '';
  }
});

// ===== ENTER KEY SUPPORT =====
form.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    this.dispatchEvent(new Event('submit'));
  }
});

// ===== PAGE LOAD =====
document.addEventListener('DOMContentLoaded', async function() {
  console.log('✅ SignUp page loaded successfully');
});