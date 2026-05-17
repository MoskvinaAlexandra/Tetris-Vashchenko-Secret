import { t } from '../../../i18n.js';

export class GameHandlers {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  handleCountdown(message) {
    const countdown = document.getElementById('countdown');
    if (countdown) {
      countdown.style.display = 'grid';
      countdown.textContent = message.count > 0 ? String(message.count) : 'GO';
    }
  }

  handleStartGame(message) {
    const { lobbyManager, matchManager, wsClient, setStatus } = this.gameManager;
    lobbyManager.playerNames.player1 = message.player1Name || lobbyManager.playerNames.player1;
    lobbyManager.playerNames.player2 = message.player2Name || lobbyManager.playerNames.player2;
    matchManager.matchSeed = Number(message.seed) || Date.now();
    lobbyManager.resetRoundFlags();
    matchManager.overlayManager.hideMatchOverlay();

    if (lobbyManager.role === 'spectator') {
      matchManager.startSpectatorMode(lobbyManager.playerNames, lobbyManager.spectators, lobbyManager);
    } else {
      matchManager.startPlayerMode(lobbyManager.role, lobbyManager.playerNames, lobbyManager.spectators, wsClient, lobbyManager);
    }
    setStatus(t('matchStarted'));
  }

  handleGameState(message) {
    const { matchManager, lobbyManager } = this.gameManager;
    const isSpectator = lobbyManager.role === 'spectator';
    matchManager.renderRemoteState(message.state, message.senderRole, isSpectator);
  }

  handleMatchEnded(message) {
    const { matchManager, lobbyManager } = this.gameManager;
    matchManager.finishMatch(message, lobbyManager.role);
  }

  handleRematchStatus() {
    this.gameManager.matchManager.overlayManager.updateRematchStatus();
  }

  handleRematchLobby(message) {
    const { lobbyManager, matchManager, setStatus } = this.gameManager;
    lobbyManager.playerNames.player1 = message.player1Name || lobbyManager.playerNames.player1;
    lobbyManager.playerNames.player2 = message.player2Name || lobbyManager.playerNames.player2;
    matchManager.resetForLobby();
    lobbyManager.resetRoundFlags();

    if (lobbyManager.role === 'spectator') {
      lobbyManager.showSpectatorLobby();
    } else {
      lobbyManager.showLobby();
    }
    lobbyManager.updateLobbyView();
    setStatus(t('roomReady', message.message));
  }
}
