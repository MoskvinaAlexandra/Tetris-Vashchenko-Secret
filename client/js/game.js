import { TetrisGame } from './game/engine/TetrisGame.js';
import { GameRenderer } from './game/ui/GameRenderer.js';
import { GameLoop } from './game/engine/GameLoop.js';
import { GameWSClient } from './websocket/GameWSClient.js';

const authService = window.authService;
const STATE_SEND_INTERVAL_MS = 50;
const SETTINGS_KEY = 'vs_game_settings';
const DEFAULT_SETTINGS = {
  darkTheme: false,
  glow: true,
  cellHighlight: true,
  compact: true
};

class GameManager {
  constructor() {
    this.wsClient = null;
    this.game = null;
    this.gameLoop = null;
    this.renderers = {};

    this.role = null;
    this.roomCode = null;
    this.myName = '';
    this.isReady = false;

    this.playerNames = {
      player1: 'Игрок 1',
      player2: 'Игрок 2'
    };

    this.spectators = [];
    this.matchSeed = Date.now();
    this.startTime = null;
    this.sentGameEnd = false;
    this.rematchRequested = false;
    this.lastStateSentAt = 0;
    this.reactionTimers = {
      player1Center: null,
      player2Center: null,
      player1Edge: null,
      player2Edge: null
    };
    this.spectatorReactionTarget = 'player1';
    this.currentSection = 'menu';

    this.settings = { ...DEFAULT_SETTINGS };
  }

  async init() {
    this.myName = authService?.getPlayerName?.() || '';
    this.settings = this.loadSettings();
    this.applySettings();
    this.bindSettingsControls();

    if (!authService?.isLoggedIn?.()) {
      this.setStatus('Авторизуйтесь, чтобы играть или смотреть матчи.', '#6a3748');
      return;
    }

    this.wsClient = new GameWSClient();
    this.setupWSCallbacks();
    this.setupKeyboard();

    this.setStatus('Подключение к игровой комнате...');
    try {
      await this.wsClient.connect();
      this.setStatus('Соединение установлено. Можно создать комнату или войти по коду.');
    } catch (error) {
      console.error('WebSocket connect failed:', error);
      this.setStatus('Не удалось подключиться к игровому серверу.', '#6a3748');
    }
  }

  setupWSCallbacks() {
    this.wsClient.onRoomCreated = (message) => {
      this.roomCode = message.code;
      this.role = message.role;
      this.wsClient.roomCode = message.code;
      this.wsClient.role = message.role;
      this.playerNames.player1 = this.myName;
      this.playerNames.player2 = 'Ожидание игрока';
      this.spectators = [];

      this.resetRoundFlags();
      this.hideMatchOverlay();
      this.showLobby();
      this.updateRoomCode(message.code);
      this.updateLobbyView();
      this.setStatus(`Комната ${message.code} создана. Поделитесь кодом с соперником.`);
    };

    this.wsClient.onJoined = (message) => {
      this.roomCode = message.code;
      this.role = message.role;
      this.wsClient.roomCode = message.code;
      this.wsClient.role = message.role;
      this.resetRoundFlags();
      this.hideMatchOverlay();
      this.updateRoomCode(message.code);

      if (message.role === 'spectator') {
        this.playerNames.player1 = message.player1Name || this.playerNames.player1;
        this.playerNames.player2 = message.player2Name || this.playerNames.player2;
        if (message.gameLive) {
          this.matchSeed = Number(message.seed) || Date.now();
          this.startSpectatorMode();
          if (message.player1State) {
            this.renderRemoteState(message.player1State, 'player1');
          }
          if (message.player2State) {
            this.renderRemoteState(message.player2State, 'player2');
          }
          this.setStatus(`Вы подключились к уже идущему матчу в комнате ${message.code}.`);
        } else {
          this.showSpectatorLobby();
          this.setStatus(`Вы вошли в комнату ${message.code} как зритель.`);
        }
        return;
      }

      this.showLobby();
      this.setStatus(`Вы вошли в комнату ${message.code}.`);
    };

    this.wsClient.onRoomState = (message) => {
      this.applyRoomState(message);
      if (this.role === 'spectator' && message.gameLive && this.currentSection !== 'spectatorArea') {
        this.startSpectatorMode();
        this.setStatus(`Вы подключились к уже идущему матчу в комнате ${message.code}.`);
      }
    };

    this.wsClient.onPlayerJoined = (message) => {
      this.setStatus(`${message.name || 'Игрок'} присоединился к комнате.`);
    };

    this.wsClient.onCountdown = (message) => {
      const countdown = document.getElementById('countdown');
      countdown.style.display = 'grid';
      countdown.textContent = message.count > 0 ? String(message.count) : 'GO';
    };

    this.wsClient.onStartGame = (message) => {
      this.playerNames.player1 = message.player1Name || this.playerNames.player1;
      this.playerNames.player2 = message.player2Name || this.playerNames.player2;
      this.matchSeed = Number(message.seed) || Date.now();

      this.resetRoundFlags();
      this.hideMatchOverlay();
      this.startTime = Date.now();

      if (this.role === 'spectator') {
        this.startSpectatorMode();
      } else {
        this.startPlayerMode();
      }
    };

    this.wsClient.onGameState = (message) => {
      this.renderRemoteState(message.state, message.senderRole);
    };

    this.wsClient.onMatchEnded = (message) => {
      this.finishMatch(message);
    };

    this.wsClient.onRematchStatus = () => {
      this.updateRematchStatus();
    };

    this.wsClient.onRematchLobby = (message) => {
      this.playerNames.player1 = message.player1Name || this.playerNames.player1;
      this.playerNames.player2 = message.player2Name || this.playerNames.player2;
      this.resetForLobby(message.message || 'Комната готова к новому раунду.');
    };

    this.wsClient.onReaction = (message) => {
      const senderRole = message.senderRole || this.resolveReactionRole(message.from);
      const targetRole = message.targetRole === 'player1' || message.targetRole === 'player2'
        ? message.targetRole
        : null;
      this.showReaction(senderRole, message.reaction || '👏', targetRole);
    };

    this.wsClient.onRoomClosed = (message) => {
      this.resetToMenu(message.message || 'Комната закрыта.');
    };

    this.wsClient.onError = (message) => {
      this.setStatus(message.message || 'Произошла ошибка WebSocket.', '#6a3748');
    };

    this.wsClient.onClose = () => {
      if (this.roomCode) {
        this.setStatus('Соединение разорвано. Можно снова войти в комнату по коду.', '#6a3748');
      }
    };
  }

  setupKeyboard() {
    document.addEventListener('keydown', (event) => {
      if (!this.gameLoop?.isRunning || this.role === 'spectator') {
        return;
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
        event.preventDefault();
        this.gameLoop.handleInput(event.key);
      }
    });
  }

  bindSettingsControls() {
    const themeToggle = document.getElementById('themeToggle');
    const glowToggle = document.getElementById('glowToggle');
    const cellHighlightToggle = document.getElementById('cellHighlightToggle');

    if (!themeToggle || !glowToggle || !cellHighlightToggle) {
      return;
    }

    themeToggle.checked = this.settings.darkTheme;
    glowToggle.checked = this.settings.glow;
    cellHighlightToggle.checked = this.settings.cellHighlight;

    themeToggle.addEventListener('change', () => {
      this.settings.darkTheme = themeToggle.checked;
      this.persistSettings();
      this.applySettings();
    });

    glowToggle.addEventListener('change', () => {
      this.settings.glow = glowToggle.checked;
      this.persistSettings();
      this.applySettings();
      this.rerenderBoards();
    });

    cellHighlightToggle.addEventListener('change', () => {
      this.settings.cellHighlight = cellHighlightToggle.checked;
      this.persistSettings();
      this.applySettings();
      this.rerenderBoards();
    });
  }

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  persistSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  applySettings() {
    document.body.classList.toggle('theme-dark', this.settings.darkTheme);
    document.body.classList.toggle('theme-light', !this.settings.darkTheme);
    document.body.classList.toggle('compact-mode', this.settings.compact);
    document.body.classList.toggle('no-glow', !this.settings.glow);
    document.body.classList.toggle('no-cell-highlight', !this.settings.cellHighlight);
  }

  rerenderBoards() {
    if (this.role === 'spectator') {
      return;
    }

    if (this.game && this.renderers[this.role]) {
      this.renderers[this.role].render(this.game.getState());
    }
  }

  toggleSettings(force) {
    const overlay = document.getElementById('settingsOverlay');
    const shouldOpen = typeof force === 'boolean' ? force : !overlay.classList.contains('is-visible');
    overlay.classList.toggle('is-visible', shouldOpen);
    overlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  }

  createRoom() {
    if (!this.canUseRoomActions()) return;
    this.wsClient.createRoom(this.myName, authService.getToken());
    this.setStatus('Создаем комнату...');
  }

  joinRoom(role) {
    if (!this.canUseRoomActions()) return;

    const code = this.getRoomInput();
    if (!code) {
      this.setStatus('Введите код комнаты.', '#6a3748');
      return;
    }

    this.wsClient.joinRoom(code, role, this.myName, authService.getToken());
    this.setStatus(`Подключаемся к комнате ${code}...`);
  }

  toggleReady() {
    if (this.role === 'spectator' || !this.roomCode) return;

    this.isReady = !this.isReady;
    this.wsClient.sendReady(this.isReady);
  }

  requestRematch() {
    if (this.role === 'spectator' || !this.roomCode || this.rematchRequested) {
      return;
    }

    this.rematchRequested = true;
    document.getElementById('rematchBtn').disabled = true;
    this.wsClient.requestRematch();
    this.setStatus('Запрос на реванш отправлен.');
  }

  startPlayerMode() {
    this.showOnly('gameArea');
    this.initArena();
    this.highlightActivePanel();

    this.renderers = {
      player1: new GameRenderer('player1Canvas'),
      player2: new GameRenderer('player2Canvas')
    };

    this.game = new TetrisGame(this.matchSeed);
    this.gameLoop = new GameLoop(this.game, this.renderers[this.role]);
    this.lastStateSentAt = 0;

    this.gameLoop.onUpdate = (state) => {
      this.updateStatsForRole(this.role, state);

      const now = performance.now();
      if (now - this.lastStateSentAt >= STATE_SEND_INTERVAL_MS) {
        this.wsClient.sendGameState(state);
        this.lastStateSentAt = now;
      }

      if (state.isGameOver && !this.sentGameEnd) {
        this.sendGameEnd();
      }
    };

    const empty = this.createEmptyState();
    this.renderBoard('player1', empty);
    this.renderBoard('player2', empty);

    const initialState = this.game.getState();
    this.renderBoard(this.role, initialState);
    this.updateStatsForRole('player1', empty);
    this.updateStatsForRole('player2', empty);
    this.updateStatsForRole(this.role, initialState);

    this.gameLoop.start();
    this.setStatus('Матч начался.');
  }

  startSpectatorMode() {
    this.showOnly('spectatorArea');
    this.updateSpectatorReactionTargetUI();

    this.renderers = {
      player1: new GameRenderer('spectatorCanvas1'),
      player2: new GameRenderer('spectatorCanvas2')
    };

    document.getElementById('spectatorPlayer1Name').textContent = this.playerNames.player1;
    document.getElementById('spectatorPlayer2Name').textContent = this.playerNames.player2;
    this.renderSpectatorsLists();

    const empty = this.createEmptyState();
    this.renderBoard('player1', empty);
    this.renderBoard('player2', empty);
    this.updateSpectatorStats('player1', empty);
    this.updateSpectatorStats('player2', empty);

    this.setStatus('Матч начался.');
  }

  renderRemoteState(state, role) {
    if (!state || !role) return;

    this.renderBoard(role, state);

    if (this.role === 'spectator') {
      this.updateSpectatorStats(role, state);
    } else {
      this.updateStatsForRole(role, state);
    }
  }

  sendGameEnd() {
    if (!this.roomCode) return;

    this.sentGameEnd = true;
    const player1Score = Number(document.getElementById('player1Score').textContent) || 0;
    const player2Score = Number(document.getElementById('player2Score').textContent) || 0;
    const player1Lines = Number(document.getElementById('player1Lines').textContent) || 0;
    const player2Lines = Number(document.getElementById('player2Lines').textContent) || 0;
    const duration = this.startTime ? Math.max(1, Math.floor((Date.now() - this.startTime) / 1000)) : 0;

    this.wsClient.sendGameEnd(player1Score, player2Score, player1Lines, player2Lines, duration);
  }

  finishMatch(message) {
    this.gameLoop?.stop();
    this.renderMatchOverlay(message);

    if (message.byForfeit) {
      this.setStatus('Матч завершен досрочно: соперник вышел.');
    }
  }

  updateRematchStatus() {
    this.showMatchOverlay();
    document.getElementById('matchResultHint').textContent = 'Один из игроков запросил реванш. Ждем второго.';
  }

  resetForLobby(statusMessage) {
    this.gameLoop?.stop();
    this.game = null;
    this.renderers = {};
    this.resetRoundFlags();
    this.hideMatchOverlay();

    if (this.role === 'spectator') {
      this.showSpectatorLobby();
    } else {
      this.showLobby();
    }

    this.updateLobbyView();
    this.setStatus(statusMessage);
  }

  applyRoomState(message) {
    this.roomCode = message.code || this.roomCode;
    this.playerNames.player1 = message.players?.player1?.name || 'Игрок 1';
    this.playerNames.player2 = message.players?.player2?.name || 'Игрок 2';
    this.spectators = message.spectators || [];

    const mySlot = this.role === 'player1' ? message.players?.player1 : message.players?.player2;
    if (this.role === 'player1' || this.role === 'player2') {
      this.isReady = Boolean(mySlot?.ready);
    }

    this.updateLobbyView(message.players);
    this.renderSpectatorsLists();
  }

  showLobby() {
    this.showOnly('lobby');
    document.getElementById('roomCodeDisplay').style.display = 'flex';
    document.getElementById('readyBtn').style.display = this.role === 'spectator' ? 'none' : 'inline-flex';
    document.getElementById('countdown').style.display = 'none';
  }

  showSpectatorLobby() {
    this.showLobby();
  }

  initArena() {
    document.getElementById('player1NameBoard').textContent = this.playerNames.player1;
    document.getElementById('player2NameBoard').textContent = this.playerNames.player2;
    this.renderSpectatorsLists();
  }

  highlightActivePanel() {
    document.getElementById('player1Panel').classList.toggle('active-player', this.role === 'player1');
    document.getElementById('player2Panel').classList.toggle('active-player', this.role === 'player2');
  }

  renderBoard(role, state) {
    const renderer = this.renderers[role];
    if (renderer) {
      renderer.render(state);
    }
  }

  renderMatchOverlay(message) {
    const resultCard = document.getElementById('matchResultCard');
    const title = document.getElementById('matchResultTitle');
    const text = document.getElementById('matchResultText');
    const hint = document.getElementById('matchResultHint');
    const rematchBtn = document.getElementById('rematchBtn');

    document.getElementById('matchScoreLeft').textContent = message.player1Score ?? 0;
    document.getElementById('matchScoreRight').textContent = message.player2Score ?? 0;
    resultCard.classList.remove('win', 'loss', 'draw');

    if (this.role === 'spectator') {
      title.textContent = 'Раунд завершен';
      text.textContent = `Победил ${message.winnerName || message.winner}.`;
      hint.textContent = 'Ждем решения игроков о реванше.';
      rematchBtn.disabled = true;
      rematchBtn.textContent = 'Ожидание игроков';
      resultCard.classList.add('draw');
    } else {
      const didWin = message.winner === this.role;
      title.textContent = didWin ? 'Вы победили' : 'Вы проиграли';
      text.textContent = didWin ? 'Раунд за вами.' : `Раунд забрал ${message.winnerName || 'соперник'}.`;
      hint.textContent = 'Нажмите «Реванш», чтобы сыграть снова в той же комнате.';
      rematchBtn.disabled = false;
      rematchBtn.textContent = 'Реванш';
      resultCard.classList.add(didWin ? 'win' : 'loss');
    }

    this.showMatchOverlay();
  }

  showMatchOverlay() {
    document.getElementById('matchOverlay').classList.add('is-visible');
  }

  hideMatchOverlay() {
    document.getElementById('matchOverlay').classList.remove('is-visible');
  }

  copyCode() {
    const code = document.getElementById('roomCode').textContent;
    if (!code) {
      this.setStatus('Сначала создайте комнату.', '#6a3748');
      return;
    }

    navigator.clipboard.writeText(code)
      .then(() => this.setStatus(`Код ${code} скопирован.`))
      .catch(() => this.setStatus('Не удалось скопировать код.', '#6a3748'));
  }

  leaveRoom() {
    this.gameLoop?.stop();

    if (this.wsClient?.ws && this.wsClient.ws.readyState === WebSocket.OPEN) {
      this.wsClient.leaveRoom();
      this.wsClient.ws.close(1000, 'leave-room');
    }

    this.resetToMenu('Вы покинули комнату.');
  }

  sendReaction(emoji) {
    if (!this.roomCode) return;

    const targetRole = this.role === 'spectator' ? this.spectatorReactionTarget : this.role;
    this.showReaction(this.role, emoji, targetRole);
    this.wsClient.sendReaction(emoji, this.myName, targetRole);
  }

  setSpectatorReactionTarget(role) {
    if (this.role !== 'spectator') return;
    if (role !== 'player1' && role !== 'player2') return;
    this.spectatorReactionTarget = role;
    this.updateSpectatorReactionTargetUI();
  }

  updateSpectatorReactionTargetUI() {
    const player1Btn = document.getElementById('spectatorTargetPlayer1');
    const player2Btn = document.getElementById('spectatorTargetPlayer2');
    if (!player1Btn || !player2Btn) {
      return;
    }

    player1Btn.classList.toggle('active-target', this.spectatorReactionTarget === 'player1');
    player2Btn.classList.toggle('active-target', this.spectatorReactionTarget === 'player2');
  }

  resolveReactionRole(fromName) {
    if (!fromName) return null;
    if (fromName === this.playerNames.player1) return 'player1';
    if (fromName === this.playerNames.player2) return 'player2';
    return null;
  }

  showReaction(senderRole, emoji, targetRole = null) {
    const normalizedEmoji = String(emoji || '').trim() || '👏';
    let targets = [];
    let timerKey = null;

    if (senderRole === 'player1') {
      targets = ['reactionPlayer1Center', 'reactionPlayer1CenterSpectator'];
      timerKey = 'player1Center';
    } else if (senderRole === 'player2') {
      targets = ['reactionPlayer2Center', 'reactionPlayer2CenterSpectator'];
      timerKey = 'player2Center';
    } else if (senderRole === 'spectator') {
      if (targetRole !== 'player1' && targetRole !== 'player2') {
        return;
      }
      const resolvedTargetRole = targetRole;
      if (resolvedTargetRole === 'player1') {
        targets = ['reactionPlayer1Edge', 'reactionPlayer1EdgeSpectator'];
        timerKey = 'player1Edge';
      } else {
        targets = ['reactionPlayer2Edge', 'reactionPlayer2EdgeSpectator'];
        timerKey = 'player2Edge';
      }
    }

    if (!targets.length || !timerKey) return;

    targets.forEach((id) => {
      const target = document.getElementById(id);
      if (!target) return;
      target.textContent = normalizedEmoji;
      target.classList.add('visible');
    });

    if (this.reactionTimers[timerKey]) {
      clearTimeout(this.reactionTimers[timerKey]);
    }

    this.reactionTimers[timerKey] = setTimeout(() => {
      targets.forEach((id) => {
        const target = document.getElementById(id);
        if (!target) return;
        target.classList.remove('visible');
        target.textContent = '';
      });
      this.reactionTimers[timerKey] = null;
    }, 1400);
  }

  canUseRoomActions() {
    if (!authService?.isLoggedIn?.()) {
      this.setStatus('Сначала войдите в аккаунт.', '#6a3748');
      window.location.href = '/login.html';
      return false;
    }

    if (!this.wsClient?.ws || this.wsClient.ws.readyState !== WebSocket.OPEN) {
      this.setStatus('Соединение еще не установлено. Обновите страницу.', '#6a3748');
      return false;
    }

    if (!this.myName) {
      this.setStatus('Не удалось определить имя игрока.', '#6a3748');
      return false;
    }

    return true;
  }

  getRoomInput() {
    return document.getElementById('roomInput').value.trim().toUpperCase();
  }

  showOnly(sectionId) {
    this.currentSection = sectionId;
    document.body.classList.toggle('in-match', sectionId === 'gameArea' || sectionId === 'spectatorArea');
    ['menu', 'lobby', 'gameArea', 'spectatorArea'].forEach((id) => {
      document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
    });
  }

  updateRoomCode(code) {
    document.getElementById('roomCode').textContent = code || '';
  }

  updateLobbyView(players = null) {
    const player1 = players?.player1;
    const player2 = players?.player2;

    document.getElementById('player1LobbyName').textContent = this.playerNames.player1;
    document.getElementById('player2LobbyName').textContent = this.playerNames.player2;

    document.getElementById('player1LobbyStatus').textContent = this.buildLobbyStatus(player1, 'player1');
    document.getElementById('player2LobbyStatus').textContent = this.buildLobbyStatus(player2, 'player2');

    document.getElementById('readyBtn').textContent = this.isReady ? 'Не готов' : 'Готов';
  }

  buildLobbyStatus(slot, role) {
    if (!slot) return 'Свободно';
    if (!slot.connected) return 'Переподключение...';
    if (slot.ready) return 'Готов';
    if (this.role === role) return 'Вы здесь';
    return 'Ждет';
  }

  renderSpectatorsLists() {
    const listIds = ['lobbySpectatorsList', 'gameSpectatorsList', 'spectatorModeList'];

    listIds.forEach((id) => {
      const list = document.getElementById(id);
      if (!list) return;

      list.innerHTML = '';
      if (!this.spectators.length) {
        const empty = document.createElement('li');
        empty.textContent = 'Пока нет зрителей';
        list.appendChild(empty);
        return;
      }

      this.spectators.forEach((spectator) => {
        const item = document.createElement('li');
        item.textContent = spectator.name || `Зритель #${spectator.playerId}`;
        list.appendChild(item);
      });
    });
  }

  updateStatsForRole(role, state) {
    const scoreEl = document.getElementById(`${role}Score`);
    const linesEl = document.getElementById(`${role}Lines`);
    if (scoreEl) scoreEl.textContent = state.score ?? 0;
    if (linesEl) linesEl.textContent = state.lines ?? 0;
  }

  updateSpectatorStats(role, state) {
    const suffix = role === 'player1' ? '1' : '2';
    document.getElementById(`spectatorScore${suffix}`).textContent = state.score ?? 0;
    document.getElementById(`spectatorLines${suffix}`).textContent = state.lines ?? 0;
  }

  resetRoundFlags() {
    this.isReady = false;
    this.sentGameEnd = false;
    this.rematchRequested = false;
    document.getElementById('rematchBtn').disabled = false;
    document.getElementById('rematchBtn').textContent = 'Реванш';
  }

  resetToMenu(statusMessage) {
    this.gameLoop?.stop();
    this.hideMatchOverlay();
    this.toggleSettings(false);

    this.roomCode = null;
    this.role = null;
    this.game = null;
    this.renderers = {};
    this.spectators = [];

    this.showOnly('menu');
    document.getElementById('roomCodeDisplay').style.display = 'none';
    document.getElementById('countdown').style.display = 'none';

    this.setStatus(statusMessage || '');
  }

  createEmptyState() {
    return {
      board: Array.from({ length: 20 }, () => Array(10).fill(0)),
      currentPiece: null,
      score: 0,
      lines: 0,
      level: 1,
      isGameOver: false
    };
  }

  setStatus(text, color = 'var(--vs-ink-muted)') {
    const status = document.getElementById('status');
    status.textContent = text;
    status.style.color = color;
  }
}

window.createRoom = () => window.gameManager?.createRoom();
window.joinAsPlayer = () => window.gameManager?.joinRoom('player');
window.joinAsSpectator = () => window.gameManager?.joinRoom('spectator');
window.toggleReady = () => window.gameManager?.toggleReady();
window.leaveRoom = () => window.gameManager?.leaveRoom();
window.sendReaction = (emoji) => window.gameManager?.sendReaction(emoji);
window.setSpectatorReactionTarget = (role) => window.gameManager?.setSpectatorReactionTarget(role);
window.copyCode = () => window.gameManager?.copyCode();
window.requestRematch = () => window.gameManager?.requestRematch();
window.toggleSettings = (force) => window.gameManager?.toggleSettings(force);

window.addEventListener('DOMContentLoaded', async () => {
  window.gameManager = new GameManager();
  await window.gameManager.init();
});
