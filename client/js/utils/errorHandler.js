function showErrorModal(message, allowReload = true) {
  const existing = document.getElementById('globalErrorModal');
  if (existing) {
    existing.remove();
  }
  const modal = document.createElement('div');
  modal.id = 'globalErrorModal';
  modal.className = 'error-modal-overlay';
  modal.innerHTML = `
    <div class="error-modal">
      <div class="error-modal-icon">⚠️</div>
      <h2 class="error-modal-title">Произошла ошибка</h2>
      <p class="error-modal-message">${message}</p>
      <div class="error-modal-actions">
        ${allowReload ? '<button class="vs-button" onclick="location.reload()">Обновить страницу</button>' : ''}
        <button class="vs-button-secondary" onclick="this.closest(\'.error-modal-overlay\').remove()">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
function showOfflineNotification() {
  const existing = document.getElementById('offlineNotification');
  if (existing) {
    return;
  }
  const notification = document.createElement('div');
  notification.id = 'offlineNotification';
  notification.className = 'offline-notification';
  notification.innerHTML = `
    <div class="offline-notification-content">
      <span class="offline-icon">📡</span>
      <span class="offline-text">Нет подключения к интернету</span>
    </div>
  `;
  document.body.appendChild(notification);
}
function hideOfflineNotification() {
  const notification = document.getElementById('offlineNotification');
  if (notification) {
    notification.remove();
  }
}
function logError(type, error, context = {}) {
  console.error(`[${type}]`, error, context);
}
window.addEventListener('error', (event) => {
  logError('Global Error', event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
  if (event.message && event.message.includes('Script error')) {
    return;
  }
  showErrorModal(
    'Что-то пошло не так. Попробуйте обновить страницу.',
    true
  );
});
window.addEventListener('unhandledrejection', (event) => {
  logError('Unhandled Promise Rejection', event.reason, {
    promise: event.promise
  });
  event.preventDefault();
  showErrorModal(
    'Произошла ошибка при выполнении операции. Попробуйте еще раз.',
    false
  );
});
window.addEventListener('error', (event) => {
  if (event.target !== window) {
    const element = event.target;
    logError('Resource Loading Error', `Failed to load: ${element.src || element.href}`, {
      tagName: element.tagName,
      src: element.src,
      href: element.href
    });
  }
}, true);
window.addEventListener('offline', () => {
  logError('Network', 'Connection lost', { online: false });
  showOfflineNotification();
});
window.addEventListener('online', () => {
  console.log('[Network] Connection restored');
  hideOfflineNotification();
  const notification = document.createElement('div');
  notification.className = 'online-notification';
  notification.innerHTML = `
    <div class="online-notification-content">
      <span class="online-icon">✓</span>
      <span class="online-text">Подключение восстановлено</span>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 3000);
});
if (typeof window !== 'undefined') {
  window.showErrorModal = showErrorModal;
  window.logError = logError;
  window.showOfflineNotification = showOfflineNotification;
  window.hideOfflineNotification = hideOfflineNotification;
}