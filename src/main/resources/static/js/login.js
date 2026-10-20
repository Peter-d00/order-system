const el = (id) => document.getElementById(id);

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated) {
      location.href = '/merchant.html';
    }
  } catch (e) {
    // Stay on the login page when the auth check fails.
  }
}

function showError(message) {
  const error = el('error');
  error.textContent = message;
  error.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  el('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = el('loginBtn');
    button.disabled = true;
    el('error').classList.add('hidden');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: el('username').value.trim(),
          password: el('password').value
        })
      });
      if (!res.ok) {
        throw new Error('用户名或密码错误');
      }
      location.href = '/merchant.html';
    } catch (e) {
      showError(e.message);
      button.disabled = false;
    }
  });
});
