export class SettingsManager {
  constructor() {
    this.onSettingsChange = null;
  }
  bindSettingsControls(rerenderCallback) {
    const themeToggle = document.getElementById('themeToggle');
    const glowToggle = document.getElementById('glowToggle');
    const cellToggle = document.getElementById('cellHighlightToggle');
    const compactToggle = document.getElementById('compactToggle');
    if (themeToggle && window.themeManager) {
      themeToggle.checked = window.themeManager.getSetting('darkTheme');
      themeToggle.addEventListener('change', (e) => {
        window.themeManager.updateSetting('darkTheme', e.target.checked);
        this.applyCompactMode();
      });
    }
    if (glowToggle && window.themeManager) {
      glowToggle.checked = window.themeManager.getSetting('glow');
      glowToggle.addEventListener('change', (e) => {
        window.themeManager.updateSetting('glow', e.target.checked);
        if (rerenderCallback) rerenderCallback();
      });
    }
    if (cellToggle && window.themeManager) {
      cellToggle.checked = window.themeManager.getSetting('cellHighlight');
      cellToggle.addEventListener('change', (e) => {
        window.themeManager.updateSetting('cellHighlight', e.target.checked);
        if (rerenderCallback) rerenderCallback();
      });
    }
    if (compactToggle && window.themeManager) {
      compactToggle.checked = window.themeManager.getSetting('compact');
      compactToggle.addEventListener('change', (e) => {
        window.themeManager.updateSetting('compact', e.target.checked);
        this.applyCompactMode();
      });
    }
    this.applyCompactMode();
  }
  applyCompactMode() {
    const compact = window.themeManager ? window.themeManager.getSetting('compact') : false;
    document.body.classList.toggle('compact-mode', compact);
  }
  toggleSettings(forceShow) {
    const overlay = document.getElementById('settingsOverlay');
    if (!overlay) return;
    const isVisible = overlay.classList.contains('is-visible');
    if (typeof forceShow === 'boolean') {
      if (forceShow && !isVisible) {
        overlay.classList.add('is-visible');
      } else if (!forceShow && isVisible) {
        overlay.classList.remove('is-visible');
      }
    } else {
      overlay.classList.toggle('is-visible');
    }
  }
}