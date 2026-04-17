(function () {
  const SETTINGS_KEY = 'vs_game_settings';
  const DEFAULT_SETTINGS = {
    darkTheme: false,
    glow: true,
    compact: false
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function applyTheme(settings) {
    document.body.classList.toggle('theme-dark', Boolean(settings.darkTheme));
    document.body.classList.toggle('theme-light', !settings.darkTheme);
  }

  function ensureOverlay(settings) {
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
    checkbox.checked = Boolean(settings.darkTheme);
    checkbox.addEventListener('change', () => {
      const nextSettings = loadSettings();
      nextSettings.darkTheme = checkbox.checked;
      saveSettings(nextSettings);
      applyTheme(nextSettings);
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
    const settings = loadSettings();
    applyTheme(settings);
    ensureOverlay(settings);

    document.querySelectorAll('.js-settings-toggle').forEach((button) => {
      button.addEventListener('click', () => toggleOverlay());
    });
  });
})();
