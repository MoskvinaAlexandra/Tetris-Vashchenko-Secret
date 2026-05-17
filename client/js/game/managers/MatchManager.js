import { MatchInitializer } from './MatchInitializer.js';
import { MatchRenderer } from './MatchRenderer.js';
import { MatchStatsUpdater } from './MatchStatsUpdater.js';
import { MatchOverlayManager } from './MatchOverlayManager.js';

export class MatchManager {
  constructor() {
    this.game = null;
    this.gameLoop = null;
    this.renderers = {};
    this.matchSeed = Date.now();
    this.startTime = null;
    this.sentGameEnd = false;
    this.lastStateSentAt = 0;

    this.initializer = new MatchInitializer(this);
    this.renderer = new MatchRenderer(this);
    this.statsUpdater = new MatchStatsUpdater();
    this.overlayManager = new MatchOverlayManager();
  }

  startPlayerMode(role, playerNames, spectators, wsClient, lobbyManager) {
    this.initializer.startPlayerMode(role, playerNames, spectators, wsClient, lobbyManager);
  }

  startSpectatorMode(playerNames, spectators, lobbyManager) {
    this.initializer.startSpectatorMode(playerNames, spectators, lobbyManager);
  }

  renderBoard(role, state) {
    this.renderer.renderBoard(role, state);
  }

  renderRemoteState(state, role, isSpectator) {
    this.renderer.renderRemoteState(state, role, isSpectator);
  }

  finishMatch(message, role) {
    this.gameLoop?.stop();
    this.overlayManager.renderMatchOverlay(message, role);
  }

  updateRematchStatus() {
    this.overlayManager.updateRematchStatus();
  }

  resetForLobby() {
    this.gameLoop?.stop();
    this.game = null;
    this.renderers = {};
    this.sentGameEnd = false;
    this.overlayManager.hideMatchOverlay();
  }

  createEmptyState() {
    return {
      board: Array.from({ length: 20 }, () => Array(10).fill(0)),
      currentPiece: null,
      score: 0,
      lines: 0,
      isGameOver: false
    };
  }

  stop() {
    this.gameLoop?.stop();
  }
}
