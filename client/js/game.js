import { GameWSClient } from './websocket/GameWSClient.js';
import { LobbyManager } from './game/managers/LobbyManager.js';
import { MatchManager } from './game/managers/MatchManager.js';
import { ReactionManager } from './game/managers/ReactionManager.js';
import { SettingsManager } from './game/managers/SettingsManager.js';
import { WSConnectionManager } from './game/managers/WSConnectionManager.js';
import { t } from './i18n.js';
import { logger } from './utils/logger.js';
const authService = window.authService;
class GameManager {
  constructor() {
    this.wsClient = null;
    this.myName = '';
    this.currentSection = 'menu';
    this.lobbyManager = new LobbyManager();
    this.matchManager = new MatchManager();
    this.reactionManager = new ReactionManager();
    this.settingsManager = new SettingsManager();
    this.wsConnectionManager = new WSConnectionManager(this);
  }
  async init() {
    this.myName = authService?.getPlayerName?.() || '';
    this.settingsManager.bindSettingsControls(() => this.rerenderBoards());
    this.setupKeyboard();
    if (!authService?.isLoggedIn?.()) {
      this.setStatus(t('authRequiredToPlay'), '#6a3748');
      return;
    }
    this.wsClient = new GameWSClient();
    this.wsConnectionManager.setupCallbacks(this.wsClient);
    this.setStatus(t('connectingToGameRoom'));
    try {
      await this.wsClient.connect();
      this.setStatus(t('connectionEstablished'));
    } catch (error) {
      logger.error('WebSocket connect failed:', error);
      this.setStatus(t('connectionFailed'), '#6a3748');
    }
  }
  setupKeyboard() {
    document.addEventListener('keydown', (event) => {
      if (!this.matchManager.gameLoop?.isRunning || this.lobbyManager.role === 'spectator') {
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
        event.preventDefault();
        this.matchManager.gameLoop.handleInput(event.key);
      }
    });
  }
  rerenderBoards() {
    if (this.lobbyManager.role === 'spectator') {
      return;
    }
    if (this.matchManager.game && this.matchManager.renderers[this.lobbyManager.role]) {
      this.matchManager.renderers[this.lobbyManager.role].render(this.matchManager.game.getState());
    }
  }
  createRoom() {
    if (!this.canUseRoomActions()) return;
    this.lobbyManager.createRoom(this.wsClient, this.myName, authService.getToken());
    this.setStatus(t('creatingRoom'));
  }
  joinRoom(role) {
    if (!this.canUseRoomActions()) return;
    const code = this.lobbyManager.getRoomInput();
    if (!code) {
      this.setStatus(t('enterRoomCode'), '#6a3748');
      return;
    }
    this.lobbyManager.joinRoom(this.wsClient, code, role, this.myName, authService.getToken());
    this.setStatus(t('connectingToRoom', code));
  }
  leaveRoom() {
    this.lobbyManager.leaveRoom(this.wsClient);
  }
  toggleReady() {
    this.lobbyManager.toggleReady(this.wsClient);
  }
  requestRematch() {
    this.lobbyManager.requestRematch(this.wsClient);
    this.setStatus(t('rematchRequested'));
  }
  sendReaction(emoji) {
    this.reactionManager.sendReaction(this.wsClient, emoji);
  }
  toggleSpectatorTarget() {
    this.reactionManager.toggleSpectatorTarget();
  }
  toggleSettings(force) {
    this.settingsManager.toggleSettings(force);
  }
  canUseRoomActions() {
    if (!authService?.isLoggedIn?.()) {
      this.setStatus(t('loginFirst'), '#6a3748');
      window.location.href = '/login.html';
      return false;
    }
    if (!this.wsClient?.ws || this.wsClient.ws.readyState !== WebSocket.OPEN) {
      this.setStatus(t('connectionNotReady'), '#6a3748');
      return false;
    }
    if (!this.myName) {
      this.setStatus(t('playerNameNotFound'), '#6a3748');
      return false;
    }
    return true;
  }
  setStatus(message, color = '') {
    const statusEl = document.getElementById('statusMessage');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = color || '';
    }
  }
}
const gameManager = new GameManager();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => gameManager.init());
} else {
  gameManager.init();
}
window.createRoom = () => gameManager.createRoom();
window.joinRoom = (role) => gameManager.joinRoom(role);
window.leaveRoom = () => gameManager.leaveRoom();
window.toggleReady = () => gameManager.toggleReady();
window.requestRematch = () => gameManager.requestRematch();
window.sendReaction = (emoji) => gameManager.sendReaction(emoji);
window.toggleSpectatorTarget = () => gameManager.toggleSpectatorTarget();
window.toggleSettings = (force) => gameManager.toggleSettings(force);
export { GameManager };