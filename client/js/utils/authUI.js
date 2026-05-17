function updateAuthUI() {
  const isLoggedIn = window.authService && typeof authService.isLoggedIn === 'function' && authService.isLoggedIn();
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const profileBtn = document.getElementById('profileBtn');
  const profileLink = document.getElementById('profileLink');
  const logoutBtn = document.getElementById('logoutBtn');
  if (isLoggedIn) {
    if (profileBtn) profileBtn.classList.remove('hidden');
    if (profileLink) profileLink.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (registerBtn) registerBtn.classList.add('hidden');
    if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
      logoutBtn.dataset.listenerAttached = 'true';
      logoutBtn.addEventListener('click', () => {
        if (window.authService && authService.logout) {
          authService.logout();
          window.location.href = '/';
        }
      });
    }
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (registerBtn) registerBtn.classList.remove('hidden');
    if (profileBtn) profileBtn.classList.add('hidden');
    if (profileLink) profileLink.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
}
function initAuthUI() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAuthUI);
  } else {
    updateAuthUI();
  }
}
if (typeof window !== 'undefined') {
  window.updateAuthUI = updateAuthUI;
  window.initAuthUI = initAuthUI;
}