import { GAME_SPEED } from '../constants/gameConstants.js';

function createTickerWorker() {
  const source = `
    let intervalId = null;

    self.onmessage = (event) => {
      if (event.data?.type === 'start') {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
          self.postMessage({ type: 'tick', now: Date.now() });
        }, event.data.interval || 16);
      }

      if (event.data?.type === 'stop') {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  `;

  const blob = new Blob([source], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

export class GameLoop {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.isRunning = false;
    this.frameCount = 0;
    this.dropInterval = GAME_SPEED.INITIAL_DROP_INTERVAL;
    this.accumulator = 0;
    this.lastFrameTime = 0;
    this.worker = null;
    this.onUpdate = null;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.accumulator = 0;
    this.lastFrameTime = Date.now();
    this.worker = createTickerWorker();
    this.worker.onmessage = (event) => {
      if (event.data?.type === 'tick') {
        this.update(event.data.now);
      }
    };
    this.worker.postMessage({ type: 'start', interval: 16 });
  }

  stop() {
    this.isRunning = false;
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.worker.terminate();
      this.worker = null;
    }
  }

  update(timestamp) {
    if (!this.isRunning || this.game.isGameOver) {
      this.stop();
      return;
    }

    const delta = Math.max(0, timestamp - this.lastFrameTime);
    this.lastFrameTime = timestamp;
    this.accumulator += delta;

    this.dropInterval = Math.max(
      GAME_SPEED.MIN_DROP_INTERVAL,
      GAME_SPEED.INITIAL_DROP_INTERVAL - this.game.lines * GAME_SPEED.ACCELERATION_PER_LINES
    );

    while (this.accumulator >= this.dropInterval && !this.game.isGameOver) {
      this.game.drop();
      this.accumulator -= this.dropInterval;
    }

    const state = this.game.getState();
    if (!document.hidden) {
      this.renderer.render(state);
      this.renderer.updateStats(state.score, state.lines, state.level);
    }
    this.onUpdate?.(state);
    this.frameCount++;
  }

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
        this.accumulator = 0;
        break;
      case ' ':
        this.game.hardDrop();
        this.accumulator = 0;
        break;
      default:
        break;
    }

    const state = this.game.getState();
    this.renderer.render(state);
    this.onUpdate?.(state);
  }

  getFPS() {
    return this.frameCount;
  }
}
