import { BOARD_CONFIG, COLORS, PIECES } from '../constants/gameConstants.js';

export class GameRenderer {
  constructor(canvasId, nextCanvasId = null) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.nextCanvas = nextCanvasId ? document.getElementById(nextCanvasId) : null;
    this.nextCtx = this.nextCanvas ? this.nextCanvas.getContext('2d') : null;
    this.setupCanvas();
    this.setupNextCanvas();
  }

  setupCanvas() {
    this.canvas.width = BOARD_CONFIG.WIDTH * BOARD_CONFIG.CELL_SIZE;
    this.canvas.height = BOARD_CONFIG.HEIGHT * BOARD_CONFIG.CELL_SIZE;
  }

  setupNextCanvas() {
    if (!this.nextCanvas) return;

    const size = Math.min(this.nextCanvas.width || 120, this.nextCanvas.height || 120);
    this.nextCanvas.width = size;
    this.nextCanvas.height = size;
  }

  render(gameState) {
    this.clear(this.ctx, this.canvas);
    this.drawBoard(gameState.board);
    this.drawCurrentPiece(gameState.currentPiece);
    this.renderNextPiece(gameState.nextPiece);
  }

  clear(context, canvas) {
    const isWhiteBoard = document.body.classList.contains('white-board');
    context.fillStyle = isWhiteBoard ? '#ffffff' : '#0a0a0a';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawBoard(board) {
    const isWhiteBoard = document.body.classList.contains('white-board');
    const gridColor = isWhiteBoard ? '#e0e0e0' : '#1a1a1a';

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cellValue = board[row][col];

        if (cellValue !== 0) {
          this.drawCell(this.ctx, col, row, COLORS[cellValue], BOARD_CONFIG.CELL_SIZE, true);
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

    const shape = PIECES[piece.type - 1]?.[piece.rotation];
    if (!shape) return;

    const color = COLORS[piece.type];

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const x = piece.x + col;
          const y = piece.y + row;

          if (y >= 0) {
            this.drawCell(this.ctx, x, y, color, BOARD_CONFIG.CELL_SIZE, true);
          }
        }
      }
    }
  }

  renderNextPiece(piece) {
    if (!this.nextCtx || !this.nextCanvas) return;

    this.clear(this.nextCtx, this.nextCanvas);
    if (!piece) return;

    const shape = PIECES[piece.type - 1]?.[piece.rotation];
    if (!shape) return;

    const isWhiteBoard = document.body.classList.contains('white-board');
    const gridColor = isWhiteBoard ? '#e0e0e0' : '#1a1a1a';
    const gridSize = 6;
    const cellSize = Math.floor(Math.min(this.nextCanvas.width, this.nextCanvas.height) / gridSize);
    const offsetX = Math.floor((this.nextCanvas.width - cellSize * gridSize) / 2);
    const offsetY = Math.floor((this.nextCanvas.height - cellSize * gridSize) / 2);

    this.nextCtx.strokeStyle = gridColor;
    this.nextCtx.lineWidth = 1;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        this.nextCtx.strokeRect(
          offsetX + col * cellSize,
          offsetY + row * cellSize,
          cellSize,
          cellSize
        );
      }
    }

    const shapeHeight = shape.length;
    const shapeWidth = Math.max(...shape.map((row) => row.length));
    const startX = Math.floor((gridSize - shapeWidth) / 2);
    const startY = Math.floor((gridSize - shapeHeight) / 2);
    const color = COLORS[piece.type];

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          this.drawCell(
            this.nextCtx,
            startX + col,
            startY + row,
            color,
            cellSize,
            false,
            offsetX,
            offsetY
          );
        }
      }
    }
  }

  drawCell(context, x, y, color, cellSize, useGlow, offsetX = 0, offsetY = 0) {
    context.fillStyle = color;
    const glowEnabled = !document.body.classList.contains('no-glow');
    context.shadowColor = color;
    context.shadowBlur = useGlow && glowEnabled ? Math.max(8, Math.round(cellSize * 0.35)) : 0;
    context.fillRect(
      offsetX + x * cellSize + 1,
      offsetY + y * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.strokeRect(
      offsetX + x * cellSize + 1,
      offsetY + y * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );
    context.shadowBlur = 0;
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
