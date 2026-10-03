// NEXORA Auth Forms (Frontend Simulation)

function initAuth() {
  if (API.isLoggedIn()) {
    window.location.href = API.safeNext('index.html');
    return;
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Password toggles
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-toggle').querySelector('input');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword 
        ? '<svg class="icon" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg class="icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors(loginForm);

      const email = loginForm.querySelector('#email').value.trim();
      const password = loginForm.querySelector('#password').value;

      let valid = true;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(loginForm, 'email', 'Please enter a valid email');
        valid = false;
      }

      if (!password || password.length < 6) {
        showError(loginForm, 'password', 'Password must be at least 6 characters');
        valid = false;
      }

      if (!valid) return;

      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      API.login({ email, password })
        .then((user) => {
          Toast.show(`Welcome back, ${user.name}!`, 'success');
          setTimeout(() => { window.location.href = API.safeNext('index.html'); }, 800);
        })
        .catch((err) => {
          showServerErrors(loginForm, err);
          btn.disabled = false;
          btn.textContent = 'Sign In';
        });
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors(registerForm);

      const name = registerForm.querySelector('#name')?.value.trim();
      const email = registerForm.querySelector('#email').value.trim();
      const password = registerForm.querySelector('#password').value;
      const confirm = registerForm.querySelector('#confirm-password').value;

      let valid = true;

      if (name !== undefined && (!name || name.length < 2)) {
        showError(registerForm, 'name', 'Please enter your name');
        valid = false;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError(registerForm, 'email', 'Please enter a valid email');
        valid = false;
      }

      if (!password || password.length < 6) {
        showError(registerForm, 'password', 'Password must be at least 6 characters');
        valid = false;
      }

      if (password !== confirm) {
        showError(registerForm, 'confirm-password', 'Passwords do not match');
        valid = false;
      }

      if (!valid) return;

      const btn = registerForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Creating account...';

      API.register({ name, email, password, confirmPassword: confirm })
        .then((user) => {
          // The server logs the new user in right away
          Toast.show(`Welcome to NEXORA, ${user.name}!`, 'success');
          setTimeout(() => { window.location.href = API.safeNext('index.html'); }, 800);
        })
        .catch((err) => {
          showServerErrors(registerForm, err);
          btn.disabled = false;
          btn.textContent = 'Create Account';
        });
    });
  }
}

// Show errors returned by the backend (e.g. "email already exists")
function showServerErrors(form, err) {
  const idMap = { confirmPassword: 'confirm-password' };
  let shown = false;
  Object.entries(err.fields || {}).forEach(([key, message]) => {
    const id = idMap[key] || key;
    if (form.querySelector('#' + id + '-error')) {
      showError(form, id, message);
      shown = true;
    }
  });
  // Wrong password, server down, etc. -> toast (and mark the password field)
  if (!shown) {
    if (err.status === 400) showError(form, 'password', err.message);
    else Toast.show(err.message, 'error', 5000);
  }
}

function showError(form, fieldId, message) {
  const input = form.querySelector(`#${fieldId}`);
  const error = form.querySelector(`#${fieldId}-error`);
  if (input) input.classList.add('error');
  if (error) {
    error.textContent = message;
    error.classList.add('show');
  }
}

function clearErrors(form) {
  form.querySelectorAll('.form-input').forEach(i => i.classList.remove('error'));
  form.querySelectorAll('.form-error').forEach(e => {
    e.classList.remove('show');
    e.textContent = '';
  });
}

document.addEventListener('DOMContentLoaded', initAuth);
