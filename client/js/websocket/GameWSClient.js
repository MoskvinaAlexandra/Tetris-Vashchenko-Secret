import { logger } from '../utils/logger.js';
export class GameWSClient {
  constructor() {
    this.ws = null;
    this.roomCode = null;
    this.role = null;
    if (!this.isWebSocketSupported()) {
      throw new Error('Ваш браузер не поддерживает WebSocket. Пожалуйста, обновите браузер.');
    }
  }
  isWebSocketSupported() {
    return 'WebSocket' in window && window.WebSocket !== undefined;
  }
  connect(url = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          logger.error('Failed to parse WebSocket message:', err);
          if (this.onError) {
            this.onError({ message: 'Invalid message format' });
          }
        }
      };
      this.ws.onclose = () => this.onClose();
      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        if (this.onError) {
          this.onError({ message: 'WebSocket connection error' });
        }
        reject(error);
      };
    });
  }
  handleMessage(message) {
    switch (message.type) {
      case 'roomCreated':
        this.onRoomCreated(message);
        break;
      case 'joined':
        this.onJoined(message);
        break;
      case 'roomState':
        this.onRoomState(message);
        break;
      case 'playerJoined':
        this.onPlayerJoined(message);
        break;
      case 'playerReady':
        this.onPlayerReady(message);
        break;
      case 'countdown':
        this.onCountdown(message);
        break;
      case 'startGame':
        this.onStartGame(message);
        break;
      case 'gameState':
        this.onGameState(message);
        break;
      case 'matchEnded':
        this.onMatchEnded(message);
        break;
      case 'rematchStatus':
        this.onRematchStatus(message);
        break;
      case 'rematchLobby':
        this.onRematchLobby(message);
        break;
      case 'reaction':
        this.onReaction(message);
        break;
      case 'roomClosed':
        this.onRoomClosed(message);
        break;
      case 'error':
        this.onError(message);
        break;
      default:
        break;
    }
  }
  createRoom(name, token) {
    this.send({ type: 'createRoom', name, token });
  }
  joinRoom(code, role, name, token) {
    this.roomCode = code;
    this.role = role;
    this.send({ type: 'joinRoom', code, role, name, token });
  }
  leaveRoom() {
    this.send({ type: 'leaveRoom', code: this.roomCode });
  }
  sendReady(ready) {
    this.send({ type: 'ready', code: this.roomCode, ready });
  }
  sendGameState(state) {
    this.send({ type: 'gameState', code: this.roomCode, state });
  }
  sendGameEnd(player1Score, player2Score, player1Lines, player2Lines, duration) {
    this.send({
      type: 'gameEnd',
      code: this.roomCode,
      player1Score,
      player2Score,
      player1Lines,
      player2Lines,
      duration
    });
  }
  sendReaction(reaction, name, targetRole = null) {
    this.send({ type: 'reaction', code: this.roomCode, reaction, name, targetRole });
  }
  requestRematch() {
    this.send({ type: 'rematchRequest', code: this.roomCode });
  }
  send(message) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    const token = message.token || window.authService?.getToken?.();
    this.ws.send(JSON.stringify(token ? { ...message, token } : message));
  }
  onRoomCreated() {}
  onJoined() {}
  onRoomState() {}
  onPlayerJoined() {}
  onPlayerReady() {}
  onCountdown() {}
  onStartGame() {}
  onGameState() {}
  onMatchEnded() {}
  onRematchStatus() {}
  onRematchLobby() {}
  onReaction() {}
  onRoomClosed() {}
  onError() {}
  onClose() {}
}