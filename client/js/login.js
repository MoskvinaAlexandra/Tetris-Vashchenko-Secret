const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameOrEmail = document.getElementById('nameOrEmail').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error');
    const successDiv = document.getElementById('success');
    errorDiv.textContent = '';
    successDiv.textContent = '';
    if (window.showLoader) window.showLoader();
    try {
      const result = await authService.login(nameOrEmail, password);
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