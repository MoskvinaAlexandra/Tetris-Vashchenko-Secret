(function () {
  function ensureOverlay() {
    if (document.getElementById('globalSettingsOverlay')) {
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'globalSettingsOverlay';
    overlay.className = 'settings-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="vs-panel settings-panel">
        <div class="settings-panel-head">
          <div>
            <h2 class="vs-section-title">Настройки</h2>
            <p class="vs-section-copy">Victoria Secret theme controls for the whole salon.</p>
          </div>
          <button class="vs-button-secondary settings-close" type="button" id="globalSettingsClose">X</button>
        </div>
        <div class="settings-grid">
          <label class="settings-item" for="globalThemeToggle">
            <span class="settings-copy">
              <strong>Темная тема</strong>
              <small>Переключает весь интерфейс между pink и burgundy.</small>
            </span>
            <input id="globalThemeToggle" type="checkbox">
          </label>
        </div>
        <div class="vs-actions settings-actions">
          <button class="vs-button" type="button" id="globalSettingsDone">Готово</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    const checkbox = document.getElementById('globalThemeToggle');
    checkbox.checked = window.themeManager ? window.themeManager.getSetting('darkTheme') : false;
    checkbox.addEventListener('change', () => {
      if (window.themeManager) {
        window.themeManager.updateSetting('darkTheme', checkbox.checked);
      }
    });
    const close = () => toggleOverlay(false);
    document.getElementById('globalSettingsClose').addEventListener('click', close);
    document.getElementById('globalSettingsDone').addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close();
      }
    });
  }
  function toggleOverlay(force) {
    const overlay = document.getElementById('globalSettingsOverlay');
    if (!overlay) return;
    const shouldOpen = typeof force === 'boolean' ? force : !overlay.classList.contains('is-visible');
    overlay.classList.toggle('is-visible', shouldOpen);
    overlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  }
  document.addEventListener('DOMContentLoaded', () => {
    ensureOverlay();
    document.querySelectorAll('.js-settings-toggle').forEach((button) => {
      button.addEventListener('click', () => toggleOverlay());
    });
  });
})();