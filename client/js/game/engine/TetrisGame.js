import { BOARD_CONFIG, PIECES } from '../constants/gameConstants.js';

export class TetrisGame {
  constructor(seed = Date.now()) {
    this.randomState = (Number(seed) || Date.now()) >>> 0;
    this.bag = [];

    this.board = this.createBoard();
    this.currentPiece = null;
    this.nextPiece = null;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.isGameOver = false;

    this.spawnNewPiece();
  }

  createBoard() {
    return Array(BOARD_CONFIG.HEIGHT).fill(null).map(() => Array(BOARD_CONFIG.WIDTH).fill(0));
  }

  nextRandom() {
    this.randomState = (1664525 * this.randomState + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  refillBag() {
    const types = Array.from({ length: PIECES.length }, (_, index) => index + 1);

    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextRandom() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    this.bag = types;
  }

  drawPieceType() {
    if (this.bag.length === 0) {
      this.refillBag();
    }
    return this.bag.pop();
  }

  spawnNewPiece() {
    if (this.nextPiece === null) {
      this.nextPiece = this.generateRandomPiece();
    }

    this.currentPiece = this.nextPiece;
    this.nextPiece = this.generateRandomPiece();

    if (this.collides(this.currentPiece, 0, 0)) {
      this.isGameOver = true;
      return false;
    }

    return true;
  }

  generateRandomPiece() {
    return {
      type: this.drawPieceType(),
      rotation: 0,
      x: Math.floor(BOARD_CONFIG.WIDTH / 2) - 1,
      y: 0
    };
  }

  collides(piece, offsetX, offsetY) {
    const shape = PIECES[piece.type - 1][piece.rotation % PIECES[piece.type - 1].length];

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;

        const newX = piece.x + col + offsetX;
        const newY = piece.y + row + offsetY;

        if (newX < 0 || newX >= BOARD_CONFIG.WIDTH || newY >= BOARD_CONFIG.HEIGHT) {
          return true;
        }

        if (newY >= 0 && this.board[newY][newX] !== 0) {
          return true;
        }
      }
    }

    return false;
  }

  lockPiece() {
    const shape = PIECES[this.currentPiece.type - 1][this.currentPiece.rotation];

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;

        const x = this.currentPiece.x + col;
        const y = this.currentPiece.y + row;

        if (y >= 0 && y < BOARD_CONFIG.HEIGHT && x >= 0 && x < BOARD_CONFIG.WIDTH) {
          this.board[y][x] = this.currentPiece.type;
        }
      }
    }

    this.clearLines();
    return this.spawnNewPiece();
  }

  clearLines() {
    let clearedLines = 0;

    for (let row = BOARD_CONFIG.HEIGHT - 1; row >= 0; row--) {
      if (this.board[row].every((cell) => cell !== 0)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(BOARD_CONFIG.WIDTH).fill(0));
        clearedLines++;
        row++;
      }
    }

    if (clearedLines > 0) {
      this.lines += clearedLines;
      this.score += clearedLines * 100 + this.level * 50;
      this.level = Math.floor(this.lines / 10) + 1;
    }

    return clearedLines;
  }

  move(direction) {
    if (!this.collides(this.currentPiece, direction, 0)) {
      this.currentPiece.x += direction;
      return true;
    }
    return false;
  }

  rotate() {
    const oldRotation = this.currentPiece.rotation;
    this.currentPiece.rotation = (this.currentPiece.rotation + 1) % PIECES[this.currentPiece.type - 1].length;

    if (this.collides(this.currentPiece, 0, 0)) {
      this.currentPiece.rotation = oldRotation;
      return false;
    }
    return true;
  }

  drop() {
    if (!this.collides(this.currentPiece, 0, 1)) {
      this.currentPiece.y++;
      return true;
    }

    return this.lockPiece();
  }

  hardDrop() {
    while (!this.collides(this.currentPiece, 0, 1)) {
      this.currentPiece.y++;
    }
    return this.lockPiece();
  }

  getState() {
    return {
      board: this.board,
      currentPiece: this.currentPiece,
      nextPiece: this.nextPiece,
      score: this.score,
      lines: this.lines,
      level: this.level,
      isGameOver: this.isGameOver
    };
  }
}
