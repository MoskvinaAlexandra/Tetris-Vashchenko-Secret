import { RoomHandlers } from './handlers/RoomHandlers.js';
import { GameHandlers } from './handlers/GameHandlers.js';
import { MiscHandlers } from './handlers/MiscHandlers.js';

export class WSConnectionManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.roomHandlers = new RoomHandlers(gameManager);
    this.gameHandlers = new GameHandlers(gameManager);
    this.miscHandlers = new MiscHandlers(gameManager);
  }

  setupCallbacks(wsClient) {
    wsClient.onRoomCreated = (message) => this.roomHandlers.handleRoomCreated(message);
    wsClient.onJoined = (message) => this.roomHandlers.handleJoined(message);
    wsClient.onRoomState = (message) => this.roomHandlers.handleRoomState(message);
    wsClient.onRoomClosed = (message) => this.roomHandlers.handleRoomClosed(message);
    
    wsClient.onPlayerJoined = (message) => this.miscHandlers.handlePlayerJoined(message);
    wsClient.onReaction = (message) => this.miscHandlers.handleReaction(message);
    wsClient.onError = (message) => this.miscHandlers.handleError(message);
    wsClient.onClose = () => this.miscHandlers.handleClose();
    
    wsClient.onCountdown = (message) => this.gameHandlers.handleCountdown(message);
    wsClient.onStartGame = (message) => this.gameHandlers.handleStartGame(message);
    wsClient.onGameState = (message) => this.gameHandlers.handleGameState(message);
    wsClient.onMatchEnded = (message) => this.gameHandlers.handleMatchEnded(message);
    wsClient.onRematchStatus = () => this.gameHandlers.handleRematchStatus();
    wsClient.onRematchLobby = (message) => this.gameHandlers.handleRematchLobby(message);
  }
}
