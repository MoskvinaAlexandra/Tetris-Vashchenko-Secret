import { TetrisGame } from '../engine/TetrisGame.js';
import { GameRenderer } from '../ui/GameRenderer.js';
import { GameLoop } from '../engine/GameLoop.js';

const STATE_SEND_INTERVAL_MS = 50;

export class MatchInitializer {
  constructor(matchManager) {
    this.matchManager = matchManager;
  }

  startPlayerMode(role, playerNames, spectators, wsClient, lobbyManager) {
    lobbyManager.showOnly('gameArea');
    this.initArena(playerNames);
    this.highlightActivePanel(role);
    this.setupRenderers();
    this.setupGame(role, wsClient);
    this.renderInitialBoards(role);
    this.matchManager.gameLoop.start();
  }

  startSpectatorMode(playerNames, spectators, lobbyManager) {
    lobbyManager.showOnly('spectatorArea');
    this.setupSpectatorRenderers();
    this.initSpectatorNames(playerNames);
    lobbyManager.renderSpectatorsLists();
    this.renderInitialSpectatorBoards();
  }

  initArena(playerNames) {
    const player1NameEl = document.getElementById('player1NameBoard');
    const player2NameEl = document.getElementById('player2NameBoard');
    if (player1NameEl) player1NameEl.textContent = playerNames.player1;
    if (player2NameEl) player2NameEl.textContent = playerNames.player2;
  }

  highlightActivePanel(role) {
    const player1Panel = document.getElementById('player1Panel');
    const player2Panel = document.getElementById('player2Panel');
    if (player1Panel) player1Panel.classList.toggle('active-player', role === 'player1');
    if (player2Panel) player2Panel.classList.toggle('active-player', role === 'player2');
  }

  setupRenderers() {
    this.matchManager.renderers = {
      player1: new GameRenderer('player1Canvas'),
      player2: new GameRenderer('player2Canvas')
    };
  }

  setupSpectatorRenderers() {
    this.matchManager.renderers = {
      player1: new GameRenderer('spectatorCanvas1'),
      player2: new GameRenderer('spectatorCanvas2')
    };
  }

  initSpectatorNames(playerNames) {
    const player1NameEl = document.getElementById('spectatorPlayer1Name');
    const player2NameEl = document.getElementById('spectatorPlayer2Name');
    if (player1NameEl) player1NameEl.textContent = playerNames.player1;
    if (player2NameEl) player2NameEl.textContent = playerNames.player2;
  }

  setupGame(role, wsClient) {
    this.matchManager.game = new TetrisGame(this.matchManager.matchSeed);
    this.matchManager.gameLoop = new GameLoop(this.matchManager.game, this.matchManager.renderers[role]);
    this.matchManager.lastStateSentAt = 0;
    this.matchManager.startTime = Date.now();

    this.matchManager.gameLoop.onUpdate = (state) => {
      this.matchManager.statsUpdater.updateStatsForRole(role, state);
      const now = performance.now();
      if (now - this.matchManager.lastStateSentAt >= STATE_SEND_INTERVAL_MS) {
        wsClient.sendGameState(state);
        this.matchManager.lastStateSentAt = now;
      }
      if (state.isGameOver && !this.matchManager.sentGameEnd) {
        this.sendGameEnd(wsClient);
      }
    };
  }

  renderInitialBoards(role) {
    const empty = this.matchManager.createEmptyState();
    this.matchManager.renderer.renderBoard('player1', empty);
    this.matchManager.renderer.renderBoard('player2', empty);
    const initialState = this.matchManager.game.getState();
    this.matchManager.renderer.renderBoard(role, initialState);
    this.matchManager.statsUpdater.updateStatsForRole('player1', empty);
    this.matchManager.statsUpdater.updateStatsForRole('player2', empty);
    this.matchManager.statsUpdater.updateStatsForRole(role, initialState);
  }

  renderInitialSpectatorBoards() {
    const empty = this.matchManager.createEmptyState();
    this.matchManager.renderer.renderBoard('player1', empty);
    this.matchManager.renderer.renderBoard('player2', empty);
    this.matchManager.statsUpdater.updateSpectatorStats('player1', empty);
    this.matchManager.statsUpdater.updateSpectatorStats('player2', empty);
  }

  sendGameEnd(wsClient) {
    this.matchManager.sentGameEnd = true;
    const player1Score = Number(document.getElementById('player1Score')?.textContent) || 0;
    const player2Score = Number(document.getElementById('player2Score')?.textContent) || 0;
    const player1Lines = Number(document.getElementById('player1Lines')?.textContent) || 0;
    const player2Lines = Number(document.getElementById('player2Lines')?.textContent) || 0;
    const duration = this.matchManager.startTime ? Math.max(1, Math.floor((Date.now() - this.matchManager.startTime) / 1000)) : 0;
    wsClient.sendGameEnd(player1Score, player2Score, player1Lines, player2Lines, duration);
  }
}
