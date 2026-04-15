import { TetrisGame } from './game/engine/TetrisGame.js';
import { GameRenderer } from './game/ui/GameRenderer.js';
import { GameLoop } from './game/engine/GameLoop.js';
import { GameWSClient } from './websocket/GameWSClient.js';

const authService = window.authService;

class GameManager {
  constructor() {
    this.wsClient = null;
    this.game = null;
    this.gameLoop = null;
    this.renderers = {};
    this.role = null;
    this.roomCode = null;
    this.myName = '';
    this.playerNames = {
      player1: 'Игрок 1',
      player2: 'Игрок 2'
    };
    this.isReady = false;
    this.startTime = null;
    this.sentGameEnd = false;
    this.rematchRequested = false;
  }

  async init() {
    this.myName = authService?.getPlayerName?.() || '';

    if (!authService?.isLoggedIn?.()) {
      this.setStatus('Авторизуйтесь, чтобы создавать дуэли и смотреть матчи.', '#6a3748');
      return;
    }

    this.wsClient = new GameWSClient();
    this.setupWSCallbacks();
    this.setupKeyboard();

    this.setStatus('Подключение к игровой комнате...');
    try {
      await this.wsClient.connect();
      this.setStatus('Соединение установлено. Можно создавать комнату или входить по коду.');
    } catch (error) {
      console.error('WebSocket connect failed:', error);
      this.setStatus('Не удалось подключиться к игровому серверу.', '#6a3748');
    }
  }

  setupWSCallbacks() {
    this.wsClient.onRoomCreated = (message) => {
      this.roomCode = message.code;
      this.role = message.role;
      this.playerNames.player1 = this.myName;
      this.playerNames.player2 = 'Ожидание игрока';
      this.resetRoundFlags();
      this.hideMatchOverlay();
      this.showLobby();
      this.updateRoomCode(message.code);
      this.updateLobbyState();
      this.setStatus(`Комната ${message.code} создана. Поделитесь кодом с соперником.`);
    };

    this.wsClient.onJoined = (message) => {
      this.roomCode = message.code;
      this.role = message.role;
      this.resetRoundFlags();
      this.hideMatchOverlay();

      if (message.role === 'spectator') {
        this.playerNames.player1 = message.player1Name || 'Игрок 1';
        this.playerNames.player2 = message.player2Name || 'Игрок 2';
        this.showSpectatorLobby();
        this.updateRoomCode(message.code);
        this.setStatus(`Вы вошли в комнату ${message.code} как зритель.`);
        return;
      }

      this.playerNames.player1 = this.role === 'player1' ? this.myName : message.opponent || 'Игрок 1';
      this.playerNames.player2 = this.role === 'player2' ? this.myName : 'Ожидание игрока';

      this.showLobby();
      this.updateRoomCode(message.code);
      this.updateLobbyState();
      this.setStatus(`Вы вошли в комнату ${message.code}.`);
    };

    this.wsClient.onPlayerJoined = (message) => {
      this.playerNames.player2 = message.name || 'Игрок 2';
      this.updateLobbyState();
      this.setStatus(`${this.playerNames.player2} присоединился к комнате.`);
    };

    this.wsClient.onPlayerReady = (message) => {
      this.updateOpponentStatus(message.ready ? 'Готов' : 'Ждёт');
    };

    this.wsClient.onCountdown = (message) => {
      const countdown = document.getElementById('countdown');
      countdown.style.display = 'grid';
      countdown.textContent = message.count > 0 ? String(message.count) : 'GO';
    };

    this.wsClient.onStartGame = (message) => {
      this.playerNames.player1 = message.player1Name || this.playerNames.player1;
      this.playerNames.player2 = message.player2Name || this.playerNames.player2;
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

    this.wsClient.onRematchStatus = (message) => {
      this.updateRematchStatus(message);
    };

    this.wsClient.onRematchLobby = (message) => {
      this.playerNames.player1 = message.player1Name || this.playerNames.player1;
      this.playerNames.player2 = message.player2Name || this.playerNames.player2;
      this.resetForLobby(message.message || 'Комната готова к новому раунду.');
    };

    this.wsClient.onReaction = (message) => {
      this.setStatus(`${message.from || 'Игрок'} отправил реакцию ${message.reaction}`);
    };

    this.wsClient.onError = (message) => {
      this.setStatus(message.message || 'Произошла ошибка WebSocket.', '#6a3748');
    };

    this.wsClient.onClose = () => {
      this.setStatus('Соединение закрыто. Обновите страницу, чтобы продолжить.', '#6a3748');
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

  createRoom() {
    if (!this.canUseRoomActions()) return;
    this.wsClient.createRoom(this.myName, authService.getToken());
    this.setStatus('Создаём комнату...');
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
    if (this.role === 'spectator') return;
    if (!this.roomCode) {
      this.setStatus('Сначала войдите в комнату.', '#6a3748');
      return;
    }

    this.isReady = !this.isReady;
    this.wsClient.sendReady(this.isReady);
    this.updateMyStatus(this.isReady ? 'Готов' : 'Ждёт');
  }

  requestRematch() {
    if (this.role === 'spectator') {
      this.setStatus('Зрители автоматически вернутся в комнату ожидания вместе с игроками.');
      return;
    }
    if (!this.roomCode || this.rematchRequested) {
      return;
    }

    this.rematchRequested = true;
    document.getElementById('rematchBtn').disabled = true;
    this.wsClient.requestRematch();
    this.setStatus('Запрос на реванш отправлен. Ждём второго игрока.');
  }

  startPlayerMode() {
    this.showOnly('gameArea');
    this.initArenaPerspective();
    this.highlightActivePanel();

    this.renderers = {
      player1: new GameRenderer('player1Canvas'),
      player2: new GameRenderer('player2Canvas')
    };

    this.game = new TetrisGame();
    this.gameLoop = new GameLoop(this.game, this.renderers[this.role]);
    this.gameLoop.onUpdate = (state) => {
      this.updateStatsForRole(this.role, state);
      this.wsClient.sendGameState(state);

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

    this.renderers = {
      player1: new GameRenderer('spectatorCanvas1'),
      player2: new GameRenderer('spectatorCanvas2')
    };

    document.getElementById('spectatorPlayer1Name').textContent = this.playerNames.player1;
    document.getElementById('spectatorPlayer2Name').textContent = this.playerNames.player2;

    const empty = this.createEmptyState();
    this.renderBoard('player1', empty);
    this.renderBoard('player2', empty);
    this.updateSpectatorStats('player1', empty);
    this.updateSpectatorStats('player2', empty);
    this.setStatus('Матч начался. Игрок 1 слева, игрок 2 справа.');
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
    if (!this.game || !this.roomCode) return;

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
  }

  updateRematchStatus(message) {
    this.showMatchOverlay();
    if (this.role === 'spectator') {
      document.getElementById('matchResultHint').textContent = 'Один из игроков уже хочет реванш. Ждём второго игрока.';
      return;
    }

    const text = message.waitingFor === 'opponent'
      ? 'Ваш запрос на реванш принят. Ждём второго игрока.'
      : 'Первый игрок уже хочет реванш. Нажмите кнопку, чтобы вернуться в комнату ожидания.';
    document.getElementById('matchResultHint').textContent = text;
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
      this.updateLobbyState();
    }

    this.setStatus(statusMessage);
  }

  showLobby() {
    this.showOnly('lobby');
    document.getElementById('roomCodeDisplay').style.display = 'flex';
    document.getElementById('readyBtn').style.display = 'inline-flex';
    document.getElementById('countdown').style.display = 'none';
    document.getElementById('myNameLobby').textContent = this.role === 'player1' ? this.playerNames.player1 : this.playerNames.player2;
    document.getElementById('oppNameLobby').textContent = this.role === 'player1' ? this.playerNames.player2 : this.playerNames.player1;
  }

  showSpectatorLobby() {
    this.showOnly('lobby');
    document.getElementById('roomCodeDisplay').style.display = 'flex';
    document.getElementById('readyBtn').style.display = 'none';
    document.getElementById('countdown').style.display = 'none';
    document.getElementById('myNameLobby').textContent = 'Зритель';
    document.getElementById('oppNameLobby').textContent = `${this.playerNames.player1} vs ${this.playerNames.player2}`;
    document.getElementById('myStatus').textContent = 'Наблюдение';
    document.getElementById('oppStatus').textContent = 'Ожидание старта';
  }

  initArenaPerspective() {
    document.getElementById('player1NameBoard').textContent = this.playerNames.player1;
    document.getElementById('player2NameBoard').textContent = this.playerNames.player2;
    const arena = document.getElementById('playerArena');
    arena.classList.toggle('player2-perspective', this.role === 'player2');
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
      title.textContent = 'Раунд завершён';
      text.textContent = `Победил ${message.winnerName || message.winner}.`;
      hint.textContent = 'Когда оба игрока выберут реванш, вы автоматически вернётесь в комнату ожидания.';
      rematchBtn.disabled = true;
      rematchBtn.textContent = 'Ожидание игроков';
      resultCard.classList.add('draw');
    } else {
      const didWin = message.winner === this.role;
      title.textContent = didWin ? 'Вы победили' : 'Вы проиграли';
      text.textContent = didWin ? 'Раунд за вами.' : `Раунд забрал ${message.winnerName || 'соперник'}.`;
      hint.textContent = 'Нажмите «Реванш», чтобы остаться в комнате и вернуться к экрану готовности.';
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
    if (this.wsClient?.ws && this.wsClient.ws.readyState < WebSocket.CLOSING) {
      this.wsClient.ws.close();
    }
    window.location.href = '/game.html';
  }

  sendReaction(emoji) {
    if (!this.roomCode || this.role === 'spectator') return;
    this.wsClient.sendReaction(emoji, this.myName);
  }

  canUseRoomActions() {
    if (!authService?.isLoggedIn?.()) {
      this.setStatus('Сначала войдите в аккаунт.', '#6a3748');
      window.location.href = '/login.html';
      return false;
    }
    if (!this.wsClient?.ws || this.wsClient.ws.readyState !== WebSocket.OPEN) {
      this.setStatus('Соединение ещё не установлено. Обновите страницу.', '#6a3748');
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
    ['menu', 'lobby', 'gameArea', 'spectatorArea'].forEach((id) => {
      document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
    });
  }

  updateRoomCode(code) {
    document.getElementById('roomCode').textContent = code || '';
  }

  updateLobbyState() {
    const myName = this.role === 'player1' ? this.playerNames.player1 : this.playerNames.player2;
    const opponentName = this.role === 'player1' ? this.playerNames.player2 : this.playerNames.player1;
    document.getElementById('myNameLobby').textContent = myName || 'Вы';
    document.getElementById('oppNameLobby').textContent = opponentName || 'Противник';
    this.updateMyStatus(this.isReady ? 'Готов' : 'Ждёт');
    this.updateOpponentStatus('Ждёт');
  }

  updateMyStatus(text) {
    document.getElementById('myStatus').textContent = text;
    document.getElementById('readyBtn').textContent = text === 'Готов' ? 'Не готов' : 'Готов';
  }

  updateOpponentStatus(text) {
    document.getElementById('oppStatus').textContent = text;
  }

  updateStatsForRole(role, state) {
    document.getElementById(`${role}Score`).textContent = state.score ?? 0;
    document.getElementById(`${role}Lines`).textContent = state.lines ?? 0;
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
window.joinAsPlayer = () => window.gameManager?.joinRoom('player2');
window.joinAsSpectator = () => window.gameManager?.joinRoom('spectator');
window.toggleReady = () => window.gameManager?.toggleReady();
window.leaveRoom = () => window.gameManager?.leaveRoom();
window.sendReaction = (emoji) => window.gameManager?.sendReaction(emoji);
window.copyCode = () => window.gameManager?.copyCode();
window.requestRematch = () => window.gameManager?.requestRematch();

window.addEventListener('DOMContentLoaded', async () => {
  window.gameManager = new GameManager();
  await window.gameManager.init();
});
