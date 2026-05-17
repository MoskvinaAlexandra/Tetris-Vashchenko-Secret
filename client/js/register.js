const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('error');
    const successDiv = document.getElementById('success');
    errorDiv.textContent = '';
    successDiv.textContent = '';
    
    if (password !== confirmPassword) {
      errorDiv.textContent = '❌ Пароли не совпадают';
      return;
    }
    
    if (window.showLoader) window.showLoader();
    try {
      const result = await authService.register(name, email, password);
      successDiv.textContent = `Добро пожаловать, ${result.player.name}! Перенаправление...`;
      setTimeout(() => {
        window.location.href = '/game.html';
      }, 1500);
    } catch (err) {
      errorDiv.textContent = '❌ ' + err.message;
    } finally {
      if (window.hideLoader) window.hideLoader();
    }
  });
}

if (authService.isLoggedIn()) {
  window.location.href = '/game.html';
}
