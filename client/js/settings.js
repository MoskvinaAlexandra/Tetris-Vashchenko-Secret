(function () {
  const SETTINGS_KEY = 'vs_game_settings';
  const DEFAULT_SETTINGS = {
    darkTheme: false,
    glow: true,
    compact: false,
    whiteBoard: false
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
    const isDark = Boolean(settings.darkTheme);
    document.documentElement.classList.toggle('theme-dark', isDark);
    document.body.classList.remove('theme-dark', 'theme-light');
  }

  function ensureOverlay(settings) {
    if (document.getElementById('globalSettingsOverlay')) {
      return;
    }

    const isGameContext = window.__SETTINGS_CONTEXT__ === 'game';

    const gameSettingsHTML = isGameContext ? `
      <label class="settings-item" for="globalGlowToggle">
        <span class="settings-copy">
          <strong>Свечение фигур</strong>
        </span>
        <input id="globalGlowToggle" type="checkbox">
      </label>
      <label class="settings-item" for="globalWhiteBoardToggle">
        <span class="settings-copy">
          <strong>Белое поле</strong>
        </span>
        <input id="globalWhiteBoardToggle" type="checkbox">
      </label>
    ` : '';

    const overlay = document.createElement('div');
    overlay.id = 'globalSettingsOverlay';
    overlay.className = 'settings-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="vs-panel settings-panel">
        <div class="settings-panel-head">
          <div>
            <h2 class="vs-section-title">Настройки</h2>
            <p class="vs-section-copy">Victoria Secret theme controls${isGameContext ? ' and game options' : ' for the whole salon'}.</p>
          </div>
          <button class="vs-button-secondary settings-close" type="button" id="globalSettingsClose">X</button>
        </div>

        <div class="settings-grid">
          <label class="settings-item" for="globalThemeToggle">
            <span class="settings-copy">
              <strong>Темная тема</strong>
            </span>
            <input id="globalThemeToggle" type="checkbox">
          </label>
          ${gameSettingsHTML}
        </div>

        <div class="vs-actions settings-actions">
          <button class="vs-button" type="button" id="globalSettingsDone">Готово</button>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);

    const themeCheckbox = document.getElementById('globalThemeToggle');
    themeCheckbox.checked = Boolean(settings.darkTheme);
    themeCheckbox.addEventListener('change', () => {
      const nextSettings = loadSettings();
      nextSettings.darkTheme = themeCheckbox.checked;
      saveSettings(nextSettings);
      applyTheme(nextSettings);
    });

    if (isGameContext) {
      const glowCheckbox = document.getElementById('globalGlowToggle');
      const whiteBoardCheckbox = document.getElementById('globalWhiteBoardToggle');

      glowCheckbox.checked = Boolean(settings.glow);
      whiteBoardCheckbox.checked = Boolean(settings.whiteBoard);

      glowCheckbox.addEventListener('change', () => {
        const nextSettings = loadSettings();
        nextSettings.glow = glowCheckbox.checked;
        saveSettings(nextSettings);
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: nextSettings }));
      });

      whiteBoardCheckbox.addEventListener('change', () => {
        const nextSettings = loadSettings();
        nextSettings.whiteBoard = whiteBoardCheckbox.checked;
        saveSettings(nextSettings);
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: nextSettings }));
      });
    }

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

  // Совместимость со старыми inline-onclick в HTML
  window.toggleSettings = (force) => toggleOverlay(force);

  document.addEventListener('DOMContentLoaded', () => {
    const settings = loadSettings();
    applyTheme(settings);
    ensureOverlay(settings);

    document.querySelectorAll('.js-settings-toggle').forEach((button) => {
      button.addEventListener('click', () => toggleOverlay());
    });
  });
})();
