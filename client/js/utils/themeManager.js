const SETTINGS_KEY = 'vs_game_settings';
const DEFAULT_SETTINGS = {
  darkTheme: false,
  glow: true,
  cellHighlight: true,
  compact: false
};
class ThemeManager {
  constructor() {
    this.settings = this.loadSettings();
  }
  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }
  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }
  getSettings() {
    return { ...this.settings };
  }
  getSetting(key) {
    return this.settings[key];
  }
  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings(this.settings);
    this.applyTheme();
  }
  applyTheme() {
    const body = document.body;
    body.classList.toggle('theme-dark', Boolean(this.settings.darkTheme));
    body.classList.toggle('theme-light', !this.settings.darkTheme);
    body.classList.toggle('no-glow', !this.settings.glow);
    body.classList.toggle('no-cell-highlight', !this.settings.cellHighlight);
  }
  toggleDarkTheme() {
    this.updateSetting('darkTheme', !this.settings.darkTheme);
    return this.settings.darkTheme;
  }
  toggleGlow() {
    this.updateSetting('glow', !this.settings.glow);
    return this.settings.glow;
  }
  toggleCellHighlight() {
    this.updateSetting('cellHighlight', !this.settings.cellHighlight);
    return this.settings.cellHighlight;
  }
  init() {
    this.applyTheme();
  }
}
const themeManager = new ThemeManager();
if (typeof window !== 'undefined') {
  window.themeManager = themeManager;
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => themeManager.init());
} else {
  themeManager.init();
}