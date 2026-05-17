import { t } from '../../../i18n.js';

export class RoomHandlers {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  handleRoomCreated(message) {
    const { lobbyManager, wsClient, myName, setStatus, matchManager } = this.gameManager;
    lobbyManager.roomCode = message.code;
    lobbyManager.role = message.role;
    wsClient.roomCode = message.code;
    wsClient.role = message.role;
    lobbyManager.playerNames.player1 = myName;
    lobbyManager.playerNames.player2 = t('waitingForPlayer');
    lobbyManager.spectators = [];
    lobbyManager.resetRoundFlags();
    matchManager.overlayManager.hideMatchOverlay();
    lobbyManager.showLobby();
    lobbyManager.updateRoomCode(message.code);
    lobbyManager.updateLobbyView();
    setStatus(`Комната ${message.code} создана. Поделитесь кодом с соперником.`);
  }

  handleJoined(message) {
    const { lobbyManager, wsClient, matchManager, setStatus } = this.gameManager;
    lobbyManager.roomCode = message.code;
    lobbyManager.role = message.role;
    wsClient.roomCode = message.code;
    wsClient.role = message.role;
    lobbyManager.resetRoundFlags();
    matchManager.overlayManager.hideMatchOverlay();
    lobbyManager.updateRoomCode(message.code);

    if (message.role === 'spectator') {
      this.handleSpectatorJoin(message, lobbyManager, matchManager, setStatus);
      return;
    }

    lobbyManager.showLobby();
    setStatus(`Вы вошли в комнату ${message.code}.`);
  }

  handleSpectatorJoin(message, lobbyManager, matchManager, setStatus) {
    lobbyManager.playerNames.player1 = message.player1Name || lobbyManager.playerNames.player1;
    lobbyManager.playerNames.player2 = message.player2Name || lobbyManager.playerNames.player2;

    if (message.gameLive) {
      matchManager.matchSeed = Number(message.seed) || Date.now();
      matchManager.startSpectatorMode(lobbyManager.playerNames, lobbyManager.spectators, lobbyManager);
      if (message.player1State) {
        matchManager.renderRemoteState(message.player1State, 'player1', true);
      }
      if (message.player2State) {
        matchManager.renderRemoteState(message.player2State, 'player2', true);
      }
      setStatus(`Вы подключились к уже идущему матчу в комнате ${message.code}.`);
    } else {
      lobbyManager.showSpectatorLobby();
      setStatus(`Вы вошли в комнату ${message.code} как зритель.`);
    }
  }

  handleRoomState(message) {
    const { lobbyManager, matchManager, setStatus, currentSection } = this.gameManager;
    lobbyManager.applyRoomState(message);
    if (lobbyManager.role === 'spectator' && message.gameLive && currentSection !== 'spectatorArea') {
      matchManager.startSpectatorMode(lobbyManager.playerNames, lobbyManager.spectators, lobbyManager);
      setStatus(`Вы подключились к уже идущему матчу в комнате ${message.code}.`);
    }
  }

  handleRoomClosed(message) {
    const { lobbyManager, matchManager, reactionManager, setStatus } = this.gameManager;
    matchManager.stop();
    reactionManager.cleanup();
    matchManager.overlayManager.hideMatchOverlay();
    lobbyManager.resetToMenu();
    setStatus(t('roomClosed', message.message));
  }
}
