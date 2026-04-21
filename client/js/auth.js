document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validation
  if (password !== confirmPassword) {
    showError('Пароли не совпадают');
    return;
  }

  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');

  errorDiv.textContent = '';
  successDiv.textContent = '';

  try {
    const result = await authService.register(name, email, password);
    successDiv.textContent = 'Регистрация успешна! Перенаправление...';
    setTimeout(() => {
      window.location.href = '/game.html';
    }, 1500);
  } catch (err) {
    errorDiv.textContent = '❌ ' + err.message;
  }
});

function showError(message) {
  document.getElementById('error').textContent = '❌ ' + message;
}

// Check if already logged in
if (authService.isLoggedIn()) {
  window.location.href = '/game.html';
}

