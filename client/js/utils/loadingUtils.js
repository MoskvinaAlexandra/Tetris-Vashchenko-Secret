function showLoader() {
  const existing = document.getElementById('globalLoader');
  if (existing) {
    return;
  }
  const loader = document.createElement('div');
  loader.id = 'globalLoader';
  loader.className = 'loading-overlay';
  loader.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(loader);
}
function hideLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    loader.remove();
  }
}
function showInlineLoader(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return null;
  const existing = element.querySelector('.loading-inline');
  if (existing) {
    return existing;
  }
  const spinner = document.createElement('span');
  spinner.className = 'loading-inline';
  element.appendChild(spinner);
  return spinner;
}
function hideInlineLoader(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const spinner = element.querySelector('.loading-inline');
  if (spinner) {
    spinner.remove();
  }
}
if (typeof window !== 'undefined') {
  window.showLoader = showLoader;
  window.hideLoader = hideLoader;
  window.showInlineLoader = showInlineLoader;
  window.hideInlineLoader = hideInlineLoader;
}