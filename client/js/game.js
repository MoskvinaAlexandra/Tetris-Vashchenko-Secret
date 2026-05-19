import { TetrisGame } from './game/engine/TetrisGame.js';
import { GameRenderer } from './game/ui/GameRenderer.js';
import { GameLoop } from './game/engine/GameLoop.js';
import { renderGameSidebars } from './game/ui/GameSidebars.js';
import { GameWSClient } from './websocket/GameWSClient.js';

const authService = window.authService;
const STATE_SEND_INTERVAL_MS = 50;
const SETTINGS_KEY = 'vs_game_settings';
const DEFAULT_SETTINGS = {
  darkTheme: false,
  glow: true,
  whiteBoard: false,
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

    this.isHeaderDisabled = false;

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
    this.spectatorReactionTarget = 'player1';
    this.currentSection = 'menu';

    this.settings = { ...DEFAULT_SETTINGS };
  }

  async init() {
    renderGameSidebars();
    this.myName = authService?.getPlayerName?.() || '';
    this.settings = this.loadSettings();
    this.applySettings();
    this.bindSettingsControls();
    this.listenToGlobalSettings();

    this.updateGameNavAuthUI();

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
      console.log('onRoomCreated - setting role to:', message.role);
      this.roomCode = message.code;
      this.role = message.role;
      this.wsClient.roomCode = message.code;
      this.wsClient.role = message.role;
      console.log('onRoomCreated - this.role is now:', this.role);
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
      console.log('onJoined - setting role to:', message.role);
      this.roomCode = message.code;
      this.role = message.role;
      this.wsClient.roomCode = message.code;
      this.wsClient.role = message.role;
      console.log('onJoined - this.role is now:', this.role);
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
      this.showReaction(senderRole, message.reaction || '👏', targetRole, message.from || '');
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

  updateGameNavAuthUI() {
    const profileNavLink = document.getElementById('profileNavLink');
    const loginNavLink = document.getElementById('loginNavLink');
    const registerNavLink = document.getElementById('registerNavLink');

    const loggedIn = Boolean(authService?.isLoggedIn?.());

    if (profileNavLink) profileNavLink.style.display = loggedIn ? 'inline-flex' : 'none';
    if (loginNavLink) loginNavLink.style.display = loggedIn ? 'none' : 'inline-flex';
    if (registerNavLink) registerNavLink.style.display = loggedIn ? 'none' : 'inline-flex';
  }

  bindSettingsControls() {
    const themeToggle = document.getElementById('themeToggle');
    const glowToggle = document.getElementById('glowToggle');

    if (!themeToggle || !glowToggle) {
      return;
    }

    themeToggle.checked = this.settings.darkTheme;
    glowToggle.checked = this.settings.glow;

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
  }

  listenToGlobalSettings() {
    window.addEventListener('settingsChanged', (event) => {
      this.settings = { ...this.settings, ...event.detail };
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
    document.body.classList.toggle('white-board', this.settings.whiteBoard);
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
    
    
    if (typeof window.toggleSettings === 'function') {
      return window.toggleSettings(force);
    }

    
    const overlay = document.getElementById('globalSettingsOverlay');
    if (!overlay) return;

    const shouldOpen = typeof force === 'boolean'
      ? force
      : !overlay.classList.contains('is-visible');

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

  setHeaderButtonsEnabled(enabled) {
    const headerNav = document.querySelector('nav.vs-nav');
    if (!headerNav) return;

    const rightLinksBlock = headerNav.querySelector('.vs-nav-links:last-child');
    if (!rightLinksBlock) return;

    const settingsBtn = rightLinksBlock.querySelector('button[onclick="toggleSettings()"], button[onclick="toggleSettings();"]');
    const controls = rightLinksBlock.querySelectorAll('a, button');

    rightLinksBlock.style.pointerEvents = enabled ? '' : 'none';
    controls.forEach((el) => {
      if (enabled) {
        el.removeAttribute('aria-disabled');
      } else {
        el.setAttribute('aria-disabled', 'true');
      }
    });

    
    
    if (settingsBtn) {
      settingsBtn.dataset.bbHeaderDisabled = enabled ? '' : '1';

      if (!settingsBtn.dataset.bbHeaderHandlerAttached) {
        settingsBtn.addEventListener('click', (e) => {
          if (settingsBtn.dataset.bbHeaderDisabled === '1') {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        }, true);
        settingsBtn.dataset.bbHeaderHandlerAttached = '1';
      }
    }

    this.isHeaderDisabled = !enabled;
  }

  startPlayerMode() {
    this.setHeaderButtonsEnabled(false);
    this.showOnly('gameArea');
    this.initArena();
    this.highlightActivePanel();
    this.hideControlsHints();

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
    this.setHeaderButtonsEnabled(false);
    this.showOnly('spectatorArea');
    this.hideControlsHints();
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

    console.log('=== CLIENT SENDING GAME END ===');
    console.log('My role (loserRole):', this.role);
    console.log('player1Score:', player1Score);
    console.log('player2Score:', player2Score);
    console.log('================================');

    this.wsClient.sendGameEnd(player1Score, player2Score, player1Lines, player2Lines, duration);
  }

  finishMatch(message) {
    console.log('=== CLIENT RECEIVED MATCH ENDED ===');
    console.log('Winner:', message.winner);
    console.log('Winner name:', message.winnerName);
    console.log('My role:', this.role);
    console.log('Did I win?', message.winner === this.role);
    console.log('===================================');

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
    this.updatePlayerReactionTargetUI();
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

    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code)
        .then(() => this.setStatus(`Код ${code} скопирован.`))
        .catch(() => this.fallbackCopyCode(code));
    } else {
      
      this.fallbackCopyCode(code);
    }
  }

  fallbackCopyCode(code) {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      this.setStatus(`Код ${code} скопирован.`);
    } catch (err) {
      this.setStatus('Не удалось скопировать код.', '#6a3748');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  leaveRoom() {
    try {
      this.gameLoop?.stop();

      if (this.wsClient?.ws && this.wsClient.ws.readyState === WebSocket.OPEN) {
        this.wsClient.leaveRoom();
        this.wsClient.ws.close(1000, 'leave-room');
      }
    } catch (e) {
      console.error('leaveRoom failed:', e);
    } finally {
      
      try {
        this.resetToMenu('Вы покинули комнату.');
      } catch (e) {
        console.error('resetToMenu failed after leaveRoom:', e);
        this.setStatus('Не удалось корректно выйти из матча.', '#6a3748');
      }
    }
  }

  sendReaction(emoji) {
    if (!this.roomCode) return;

    const targetRole = this.role === 'spectator'
      ? this.spectatorReactionTarget
      : (this.role === 'player1' ? 'player2' : 'player1');
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

    player1Btn.textContent = this.truncateReactionTargetName(this.playerNames.player1 || 'Игрок 1');
    player2Btn.textContent = this.truncateReactionTargetName(this.playerNames.player2 || 'Игрок 2');
    player1Btn.classList.toggle('active-target', this.spectatorReactionTarget === 'player1');
    player2Btn.classList.toggle('active-target', this.spectatorReactionTarget === 'player2');
  }

  updatePlayerReactionTargetUI() {
    const targetBtn = document.getElementById('playerReactionTargetBtn');
    if (!targetBtn) {
      return;
    }

    const opponentName = this.role === 'player1'
      ? this.playerNames.player2
      : this.role === 'player2'
        ? this.playerNames.player1
        : 'Соперник';

    targetBtn.textContent = this.truncateReactionTargetName(opponentName || 'Соперник');
  }

  truncateReactionTargetName(name) {
    const normalized = String(name || '').trim();
    if (!normalized) return '...';
    return normalized.length > 14 ? `${normalized.slice(0, 11)}...` : normalized;
  }

  resolveReactionRole(fromName) {
    if (!fromName) return null;
    if (fromName === this.playerNames.player1) return 'player1';
    if (fromName === this.playerNames.player2) return 'player2';
    return null;
  }

  showReaction(senderRole, emoji, targetRole = null, senderName = '') {
    const normalizedEmoji = String(emoji || '').trim() || '👏';
    const reactionLabel = this.buildReactionLabel(senderRole, senderName);
    let targets = [];

    if (senderRole === 'player1') {
      const resolvedTargetRole = targetRole === 'player1' || targetRole === 'player2' ? targetRole : 'player2';
      targets = [
        { id: 'reactionArenaLayer', role: resolvedTargetRole },
        { id: 'reactionArenaLayerSpectator', role: resolvedTargetRole }
      ];
    } else if (senderRole === 'player2') {
      const resolvedTargetRole = targetRole === 'player1' || targetRole === 'player2' ? targetRole : 'player1';
      targets = [
        { id: 'reactionArenaLayer', role: resolvedTargetRole },
        { id: 'reactionArenaLayerSpectator', role: resolvedTargetRole }
      ];
    } else if (senderRole === 'spectator') {
      if (targetRole !== 'player1' && targetRole !== 'player2') {
        return;
      }
      const resolvedTargetRole = targetRole;
      if (resolvedTargetRole === 'player1') {
        targets = [{ id: 'reactionPlayer1Edge' }, { id: 'reactionPlayer1EdgeSpectator' }];
      } else {
        targets = [{ id: 'reactionPlayer2Edge' }, { id: 'reactionPlayer2EdgeSpectator' }];
      }
    }

    if (!targets.length) return;

    targets.forEach((targetConfig) => {
      this.spawnReactionBubble(targetConfig, senderRole, normalizedEmoji, reactionLabel);
    });
  }

  spawnReactionBubble(targetConfig, senderRole, emoji, reactionLabel) {
    const targetId = typeof targetConfig === 'string' ? targetConfig : targetConfig.id;
    const targetRole = typeof targetConfig === 'string' ? null : targetConfig.role || null;
    const target = document.getElementById(targetId);
    if (!target) return;
    const panel = target.closest('.board-panel');

    const bubble = this.createReactionContent(emoji, reactionLabel, senderRole === 'spectator');
    if (senderRole !== 'spectator') {
      
      bubble.classList.add(targetRole === 'player2' ? 'anchor-right' : 'anchor-left');
      bubble.classList.add(senderRole === 'player2' ? 'tail-right' : 'tail-left');
      this.getReactionHostPanel(target, targetRole)?.classList.add('reaction-host-active');
    }
    target.appendChild(bubble);

    if (senderRole === 'spectator') {
      this.fitReactionLabel(target, bubble, senderRole);
    } else {
      this.fitReactionLabel(target, bubble, senderRole, targetId, targetRole);
    }

    const position = senderRole === 'spectator'
      ? this.getSpectatorReactionPosition(target, bubble)
      : this.getPlayerReactionPosition(target, bubble, targetRole);

    bubble.style.left = `${position.left}px`;
    bubble.style.top = `${position.top}px`;

    requestAnimationFrame(() => {
      bubble.classList.add('visible');
    });

    window.setTimeout(() => {
      bubble.classList.remove('visible');
      window.setTimeout(() => {
        bubble.remove();
        this.releaseReactionHost(this.getReactionHostPanel(target, targetRole));
      }, 220);
    }, 1400);
  }

  getReactionHostPanel(target, targetRole) {
    if (target.closest('.board-panel')) {
      return target.closest('.board-panel');
    }

    if (targetRole === 'player1') {
      return document.getElementById(target.id === 'reactionArenaLayerSpectator' ? 'spectatorPlayer1Panel' : 'player1Panel');
    }

    if (targetRole === 'player2') {
      return document.getElementById(target.id === 'reactionArenaLayerSpectator' ? 'spectatorPlayer2Panel' : 'player2Panel');
    }

    return null;
  }

  releaseReactionHost(panel) {
    if (!panel) return;
    if (panel.querySelector('.reaction-pop-item')) {
      return;
    }
    panel.classList.remove('reaction-host-active');
  }

  getSpectatorReactionPosition(target, bubble) {
    const panel = target.closest('.board-panel');
    const canvas = panel?.querySelector('canvas');
    if (!panel || !canvas) {
      return {
        left: panel?.clientWidth ? panel.clientWidth / 2 : 120,
        top: 52
      };
    }

    const panelRect = panel.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const targetWidth = Math.max(bubble.offsetWidth || 150, 120);
    const bubbleHalf = targetWidth / 2;
    const margin = 12;
    const visualGap = 20;
    const anchorTop = (canvasRect.top - panelRect.top) - visualGap;
    const minAnchorTop = 44;

    const minLeft = Math.max(margin + bubbleHalf, (canvasRect.left - panelRect.left) + bubbleHalf);
    const maxLeft = Math.min(
      panelRect.width - margin - bubbleHalf,
      (canvasRect.right - panelRect.left) - bubbleHalf
    );

    if (maxLeft <= minLeft) {
      return {
        left: panelRect.width / 2,
        top: Math.max(anchorTop, minAnchorTop)
      };
    }

    const mean = (minLeft + maxLeft) / 2;
    const sigma = Math.max((maxLeft - minLeft) / 6, 10);
    const random = this.randomNormal(mean, sigma);
    return {
      left: Math.min(maxLeft, Math.max(minLeft, random)),
      top: Math.max(anchorTop, minAnchorTop)
    };
  }

  getPlayerReactionPosition(target, bubble, targetRole) {
    const arena = target.closest('.arena-grid');
    if (!arena || (targetRole !== 'player1' && targetRole !== 'player2')) {
      return { left: 120, top: 180 };
    }

    const arenaRect = arena.getBoundingClientRect();
    const targetCanvas = arena.querySelector(targetRole === 'player1' ? '#player1Canvas, #spectatorCanvas1' : '#player2Canvas, #spectatorCanvas2');
    if (!targetCanvas) {
      return { left: 120, top: 180 };
    }

    const canvasRect = targetCanvas.getBoundingClientRect();
    const canvasTop = canvasRect.top - arenaRect.top;
    const canvasHeight = canvasRect.height;
    const top = canvasTop + (canvasHeight * 0.46);
    const gapBounds = this.getArenaReactionGapBounds(arena, bubble);

    if (gapBounds) {
      return {
        left: targetRole === 'player2' ? gapBounds.rightEdge : gapBounds.leftEdge,
        top
      };
    }

    const canvasLeft = canvasRect.left - arenaRect.left;
    const canvasRight = canvasRect.right - arenaRect.left;

    return {
      left: targetRole === 'player2' ? canvasLeft - 10 : canvasRight + 10,
      top
    };
  }

  getArenaReactionGapBounds(arena, bubble) {
    const arenaRect = arena.getBoundingClientRect();
    const canvases = Array.from(arena.querySelectorAll('canvas'));
    if (canvases.length < 2) {
      return null;
    }

    const [firstCanvas, secondCanvas] = canvases.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const leftCanvasRect = firstCanvas.getBoundingClientRect();
    const rightCanvasRect = secondCanvas.getBoundingClientRect();
    const gapMargin = 12;

    const gapLeft = (leftCanvasRect.right - arenaRect.left) + gapMargin;
    const gapRight = (rightCanvasRect.left - arenaRect.left) - gapMargin;
    const gapWidth = gapRight - gapLeft;

    if (gapWidth <= 48) {
      return null;
    }

    bubble.style.minWidth = `${Math.max(Math.min(gapWidth, 96), 64)}px`;
    bubble.style.maxWidth = `${gapWidth}px`;

    return {
      leftEdge: gapLeft,
      rightEdge: gapRight,
      width: gapWidth
    };
  }

  randomNormal(mean, sigma) {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const standardNormal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + standardNormal * sigma;
  }

  buildReactionLabel(senderRole, senderName) {
    const normalizedName = String(senderName || '').trim();
    if (senderRole === 'spectator') {
      return normalizedName ? `От зрителя: ${normalizedName}` : 'От зрителя';
    }

    return normalizedName ? `От соперника: ${normalizedName}` : 'От соперника';
  }

  fitReactionLabel(target, bubble, senderRole, targetId = '', targetRole = null) {
    const labelNode = bubble.querySelector('.reaction-pop-label');
    if (!labelNode) return;

    const shortLabel = senderRole === 'spectator' ? 'От зрителя: ...' : 'От соперника: ...';
    let maxWidth = null;

    if (senderRole === 'spectator') {
      const panel = target.closest('.board-panel');
      const canvas = panel?.querySelector('canvas');
      if (panel && canvas) {
        maxWidth = Math.max(canvas.getBoundingClientRect().width - 24, 120);
      }
    } else {
      const arena = target.closest('.arena-grid');
      if (arena) {
        const gapBounds = this.getArenaReactionGapBounds(arena, bubble);
        maxWidth = gapBounds?.width || 96;
      }
    }

    if (!maxWidth) {
      return;
    }

    bubble.style.maxWidth = `${Math.max(maxWidth, 64)}px`;
    if (bubble.offsetWidth <= maxWidth) {
      return;
    }

    labelNode.textContent = shortLabel;
    if (bubble.offsetWidth <= maxWidth) {
      return;
    }

    labelNode.textContent = '...';
  }

  createReactionContent(emoji, label, isSpectatorReaction = false) {
    const bubble = document.createElement('div');
    bubble.className = `reaction-pop-item ${isSpectatorReaction ? 'spectator-reaction' : ''}`.trim();

    const emojiNode = document.createElement('span');
    emojiNode.className = 'reaction-pop-emoji';
    emojiNode.textContent = emoji;

    const labelNode = document.createElement('span');
    labelNode.className = 'reaction-pop-label';
    labelNode.textContent = label;

    bubble.append(emojiNode, labelNode);
    return bubble;
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
    const normalizedCode = code || '';
    document.getElementById('roomCode').textContent = normalizedCode;

    const buttonLabel = normalizedCode || '----';
    const matchRoomCodeBtn = document.getElementById('matchRoomCodeBtn');
    const spectatorRoomCodeBtn = document.getElementById('spectatorRoomCodeBtn');
    if (matchRoomCodeBtn) {
      matchRoomCodeBtn.textContent = buttonLabel;
    }
    if (spectatorRoomCodeBtn) {
      spectatorRoomCodeBtn.textContent = buttonLabel;
    }
  }

  updateLobbyView(players = null) {
    const player1 = players?.player1;
    const player2 = players?.player2;

    document.getElementById('player1LobbyName').textContent = this.playerNames.player1;
    document.getElementById('player2LobbyName').textContent = this.playerNames.player2;

    document.getElementById('player1LobbyStatus').textContent = this.buildLobbyStatus(player1, 'player1');
    document.getElementById('player2LobbyStatus').textContent = this.buildLobbyStatus(player2, 'player2');
    this.updatePlayerReactionTargetUI();

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

  clearReactionDisplays() {
    [
      'reactionPlayer1Center',
      'reactionPlayer2Center',
      'reactionPlayer1Edge',
      'reactionPlayer2Edge',
      'reactionArenaLayer',
      'reactionArenaLayerSpectator',
      'reactionPlayer1EdgeSpectator',
      'reactionPlayer2EdgeSpectator'
    ].forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.replaceChildren();
    });
  }

  resetRoundFlags() {
    this.isReady = false;
    this.sentGameEnd = false;
    this.rematchRequested = false;
    this.spectatorReactionTarget = 'player1';
    this.clearReactionDisplays();
    document.getElementById('rematchBtn').disabled = false;
    document.getElementById('rematchBtn').textContent = 'Реванш';
  }

  resetToMenu(statusMessage) {
    this.setHeaderButtonsEnabled(true);
    this.gameLoop?.stop();
    this.hideMatchOverlay();
    this.toggleSettings(false);

    this.roomCode = null;
    this.role = null;
    this.game = null;
    this.renderers = {};
    this.spectators = [];
    this.spectatorReactionTarget = 'player1';
    this.clearReactionDisplays();

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

  hideControlsHints() {
    const hints = document.querySelectorAll('.game-controls-hint');
    hints.forEach(hint => {
      hint.style.display = 'none';
    });
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


window.addEventListener('DOMContentLoaded', async () => {
  window.gameManager = new GameManager();
  await window.gameManager.init();
});
