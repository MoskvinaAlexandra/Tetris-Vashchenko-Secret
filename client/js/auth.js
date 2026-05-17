document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');
  errorDiv.textContent = '';
  successDiv.textContent = '';
  if (name.length < 3 || name.length > 50) {
    showError('Имя должно содержать от 3 до 50 символов');
    return;
  }
  if (!email.includes('@') || email.length < 5) {
    showError('Введите корректный email адрес');
    return;
  }
  if (password.length < 6) {
    showError('Пароль должен содержать минимум 6 символов');
    return;
  }
  if (password !== confirmPassword) {
    showError('Пароли не совпадают');
    return;
  }
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
if (authService.isLoggedIn()) {
  window.location.href = '/game.html';
}