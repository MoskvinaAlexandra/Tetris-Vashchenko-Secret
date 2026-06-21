function getSafeReturnTo() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');

  if (!returnTo) {
    return '/game.html';
  }

  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }

  return '/game.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nameOrEmail = document.getElementById('nameOrEmail').value.trim();
  const password = document.getElementById('password').value;

  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');

  errorDiv.textContent = '';
  successDiv.textContent = '';

  try {
    const result = await authService.login(nameOrEmail, password);
    successDiv.textContent = `Добро пожаловать, ${result.player.name}! Перенаправление...`;
    const returnTo = getSafeReturnTo();
    setTimeout(() => {
      window.location.href = returnTo;
    }, 1500);
  } catch (err) {
    errorDiv.textContent = '❌ ' + err.message;
  }
});


if (authService.isLoggedIn()) {
  window.location.href = getSafeReturnTo();
}

