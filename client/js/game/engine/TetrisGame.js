// client/js/game/engine/TetrisGame.js — Pure game logic (SRP - Single Responsibility)
import { BOARD_CONFIG, PIECES, COLORS } from '../constants/gameConstants.js';

export class TetrisGame {
  constructor() {
    this.board = this.createBoard();
    this.currentPiece = null;
    this.nextPiece = null;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.isGameOver = false;

    this.spawnNewPiece();
  }

  /**
   * Create empty 2D board
   */
  createBoard() {
    return Array(BOARD_CONFIG.HEIGHT).fill(null).map(() =>
      Array(BOARD_CONFIG.WIDTH).fill(0)
    );
  }

  /**
   * Spawn new piece at top
   */
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

  /**
   * Generate random tetromino
   */
  generateRandomPiece() {
    const type = Math.floor(Math.random() * PIECES.length);
    return {
      type: type + 1,
      rotation: 0,
      x: Math.floor(BOARD_CONFIG.WIDTH / 2) - 1,
      y: 0
    };
  }

  /**
   * Check collision
   */
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

  /**
   * Lock piece on board
   */
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

  /**
   * Clear completed lines
   */
  clearLines() {
    let clearedLines = 0;

    for (let row = BOARD_CONFIG.HEIGHT - 1; row >= 0; row--) {
      if (this.board[row].every(cell => cell !== 0)) {
        this.board.splice(row, 1);
        this.board.unshift(Array(BOARD_CONFIG.WIDTH).fill(0));
        clearedLines++;
        row++;
      }
    }

    if (clearedLines > 0) {
      this.lines += clearedLines;
      this.score += clearedLines * 100 + (this.level * 50);
      this.level = Math.floor(this.lines / 10) + 1;
    }

    return clearedLines;
  }

  /**
   * Move piece left/right
   */
  move(direction) {
    if (!this.collides(this.currentPiece, direction, 0)) {
      this.currentPiece.x += direction;
      return true;
    }
    return false;
  }

  /**
   * Rotate piece
   */
  rotate() {
    const oldRotation = this.currentPiece.rotation;
    this.currentPiece.rotation = (this.currentPiece.rotation + 1) % PIECES[this.currentPiece.type - 1].length;

    if (this.collides(this.currentPiece, 0, 0)) {
      this.currentPiece.rotation = oldRotation;
      return false;
    }
    return true;
  }

  /**
   * Drop piece by one row
   */
  drop() {
    if (!this.collides(this.currentPiece, 0, 1)) {
      this.currentPiece.y++;
      return true;
    } else {
      return this.lockPiece();
    }
  }

  /**
   * Hard drop to bottom
   */
  hardDrop() {
    while (!this.collides(this.currentPiece, 0, 1)) {
      this.currentPiece.y++;
    }
    return this.lockPiece();
  }

  /**
   * Get game state for rendering
   */
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

