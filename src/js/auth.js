(function () {
  'use strict';

  function setBanner(message, type) {
    const banner = document.getElementById('auth-banner');
    const text = document.getElementById('auth-banner-text');
    if (!banner || !text) return;

    banner.classList.remove('alert-success', 'alert-danger', 'alert-warning');
    banner.classList.add(`alert-${type || 'danger'}`);
    text.textContent = message;
    banner.style.display = 'block';
  }

  async function handleLogin(button) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = (usernameInput?.value || '').trim();
    const password = passwordInput?.value || '';

    if (!username || !password) {
      setBanner('Username and password are required.', 'warning');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Signing in...';
    }

    try {
      const response = await fetch('/api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.success) {
        window.location = '/?page=admin';
        return;
      }

      const message = payload.message || 'Login failed. Please check your credentials.';
      setBanner(message, 'danger');
    } catch (error) {
      setBanner('Unable to sign in right now. Please try again.', 'danger');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Submit';
      }
    }
  }

  async function logoff() {
    try {
      await fetch('/api/logout.php', { method: 'POST' });
    } catch (error) {
      // Ignore network errors; we still redirect to login.
    } finally {
      window.location = '/?page=login';
    }
  }

  window.handleLogin = handleLogin;
  window.logoff = logoff;
})();
