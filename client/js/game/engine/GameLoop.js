// client/js/game/engine/GameLoop.js — Game loop management (SRP)
import { GAME_SPEED } from '../constants/gameConstants.js';

export class GameLoop {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.isRunning = false;
    this.frameCount = 0;
    this.dropInterval = GAME_SPEED.INITIAL_DROP_INTERVAL;
    this.lastDropTime = Date.now();
    this.frameRate = 60;
    this.frameTime = 1000 / this.frameRate;
    this.onUpdate = null;
  }

  /**
   * Start game loop
   */
  start() {
    this.isRunning = true;
    this.lastDropTime = Date.now();
    this.gameLoopId = setInterval(() => this.update(), this.frameTime);
  }

  /**
   * Stop game loop
   */
  stop() {
    this.isRunning = false;
    if (this.gameLoopId) {
      clearInterval(this.gameLoopId);
    }
  }

  /**
   * Update game state and render
   */
  update() {
    if (!this.isRunning || this.game.isGameOver) {
      this.stop();
      return;
    }

    const now = Date.now();
    const timeSinceLastDrop = now - this.lastDropTime;

    // Update drop interval based on level
    this.dropInterval = Math.max(
      GAME_SPEED.MIN_DROP_INTERVAL,
      GAME_SPEED.INITIAL_DROP_INTERVAL - (this.game.lines * GAME_SPEED.ACCELERATION_PER_LINES)
    );

    // Auto-drop piece
    if (timeSinceLastDrop >= this.dropInterval) {
      this.game.drop();
      this.lastDropTime = now;
    }

    // Render current state
    const state = this.game.getState();
    this.renderer.render(state);
    this.renderer.updateStats(state.score, state.lines, state.level);
    this.onUpdate?.(state);

    this.frameCount++;
  }

  /**
   * Handle input
   */
  handleInput(key) {
    if (!this.isRunning || this.game.isGameOver) return;

    switch (key) {
      case 'ArrowLeft':
        this.game.move(-1);
        break;
      case 'ArrowRight':
        this.game.move(1);
        break;
      case 'ArrowUp':
        this.game.rotate();
        break;
      case 'ArrowDown':
        this.game.drop();
        this.lastDropTime = Date.now();
        break;
      case ' ':
        this.game.hardDrop();
        this.lastDropTime = Date.now();
        break;
    }

    // Render after input
    const state = this.game.getState();
    this.renderer.render(state);
    this.onUpdate?.(state);
  }

  /**
   * Get current FPS
   */
  getFPS() {
    return this.frameCount;
  }
}

