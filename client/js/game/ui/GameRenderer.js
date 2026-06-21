import { BOARD_CONFIG, COLORS, PIECES } from '../constants/gameConstants.js';

export class GameRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.setupCanvas();
  }

  setupCanvas() {
    this.canvas.width = BOARD_CONFIG.WIDTH * BOARD_CONFIG.CELL_SIZE;
    this.canvas.height = BOARD_CONFIG.HEIGHT * BOARD_CONFIG.CELL_SIZE;
  }

  render(gameState) {
    this.clear();
    this.drawBoard(gameState.board);
    this.drawCurrentPiece(gameState.currentPiece);
  }

  clear() {
    const isWhiteBoard = document.body.classList.contains('white-board');
    this.ctx.fillStyle = isWhiteBoard ? '#ffffff' : '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  
  drawBoard(board) {
    const isWhiteBoard = document.body.classList.contains('white-board');
    const gridColor = isWhiteBoard ? '#e0e0e0' : '#1a1a1a';

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cellValue = board[row][col];

        if (cellValue !== 0) {
          this.drawCell(col, row, COLORS[cellValue]);
        }

        
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
          col * BOARD_CONFIG.CELL_SIZE,
          row * BOARD_CONFIG.CELL_SIZE,
          BOARD_CONFIG.CELL_SIZE,
          BOARD_CONFIG.CELL_SIZE
        );
      }
    }
  }

  
  drawCurrentPiece(piece) {
    if (!piece) return;

    const shape = PIECES[piece.type - 1][piece.rotation];
    const color = COLORS[piece.type];

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const x = piece.x + col;
          const y = piece.y + row;

          if (y >= 0) {
            this.drawCell(x, y, color);
          }
        }
      }
    }
  }

  
  drawCell(x, y, color) {
    this.ctx.fillStyle = color;
    const glowEnabled = !document.body.classList.contains('no-glow');
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = glowEnabled ? 20 : 0;
    this.ctx.fillRect(
      x * BOARD_CONFIG.CELL_SIZE + 1,
      y * BOARD_CONFIG.CELL_SIZE + 1,
      BOARD_CONFIG.CELL_SIZE - 2,
      BOARD_CONFIG.CELL_SIZE - 2
    );
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(
      x * BOARD_CONFIG.CELL_SIZE + 1,
      y * BOARD_CONFIG.CELL_SIZE + 1,
      BOARD_CONFIG.CELL_SIZE - 2,
      BOARD_CONFIG.CELL_SIZE - 2
    );
    this.ctx.shadowBlur = 0;
  }

  
  updateStats(score, lines, level) {
    const scoreEl = document.getElementById('score') || document.getElementById('myScore');
    const linesEl = document.getElementById('lines') || document.getElementById('myLines');
    const levelEl = document.getElementById('level');

    if (scoreEl) scoreEl.textContent = score;
    if (linesEl) linesEl.textContent = lines;
    if (levelEl) levelEl.textContent = level;
  }

}

