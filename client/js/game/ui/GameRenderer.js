// client/js/game/ui/GameRenderer.js — Only rendering logic (SRP)
import { BOARD_CONFIG, COLORS, PIECES } from '../constants/gameConstants.js';

export class GameRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.setupCanvas();
  }

  /**
   * Setup canvas dimensions
   */
  setupCanvas() {
    this.canvas.width = BOARD_CONFIG.WIDTH * BOARD_CONFIG.CELL_SIZE;
    this.canvas.height = BOARD_CONFIG.HEIGHT * BOARD_CONFIG.CELL_SIZE;
  }

  /**
   * Render game state
   */
  render(gameState) {
    this.clear();
    this.drawCellHighlights(gameState.board);
    this.drawBoard(gameState.board);
    this.drawCurrentPiece(gameState.currentPiece);
  }

  /**
   * Clear canvas
   */
  clear() {
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw cell highlights for empty cells (grid effect)
   */
  drawCellHighlights(board) {
    const highlightEnabled = !document.body.classList.contains('no-cell-highlight');
    if (!highlightEnabled) return;

    // Get current piece to determine highlight color
    const highlightColor = 'rgba(93, 217, 161, 0.08)'; // Default accent color with transparency

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cellValue = board[row][col];
        
        // Only highlight empty cells
        if (cellValue === 0) {
          this.ctx.fillStyle = highlightColor;
          this.ctx.fillRect(
            col * BOARD_CONFIG.CELL_SIZE + 1,
            row * BOARD_CONFIG.CELL_SIZE + 1,
            BOARD_CONFIG.CELL_SIZE - 2,
            BOARD_CONFIG.CELL_SIZE - 2
          );
        }
      }
    }
  }

  /**
   * Draw board cells
   */
  drawBoard(board) {
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cellValue = board[row][col];

        if (cellValue !== 0) {
          this.drawCell(col, row, COLORS[cellValue]);
        }

        // Draw grid
        this.ctx.strokeStyle = '#1a1a1a';
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

  /**
   * Draw current falling piece
   */
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

  /**
   * Draw single cell
   */
  drawCell(x, y, color) {
    this.ctx.fillStyle = color;
    const glowEnabled = !document.body.classList.contains('no-glow');
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = glowEnabled ? 4 : 0;
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

  /**
   * Update UI stats
   */
  updateStats(score, lines, level) {
    const scoreEl = document.getElementById('score') || document.getElementById('myScore');
    const linesEl = document.getElementById('lines') || document.getElementById('myLines');
    const levelEl = document.getElementById('level');

    if (scoreEl) scoreEl.textContent = score;
    if (linesEl) linesEl.textContent = lines;
    if (levelEl) levelEl.textContent = level;
  }

  /**
   * Show game over message
   */
  showGameOver(score) {
    const gameOverEl = document.createElement('div');
    gameOverEl.id = 'gameOverScreen';
    gameOverEl.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: #0a0a0a; border: 2px solid #0f0; padding: 20px; text-align: center; 
                  border-radius: 10px; color: #0f0; font-family: monospace;">
        <h1>GAME OVER</h1>
        <p>Final Score: ${score}</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #0f0; color: #0a0a0a; border: none; cursor: pointer; margin-top: 10px;">Restart</button>
      </div>
    `;
    document.body.appendChild(gameOverEl);
  }
}

