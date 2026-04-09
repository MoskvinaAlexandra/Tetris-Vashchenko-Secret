// Tetris Vashchenko Secret: Full Game Engine + WS Multiplayer + AI
// Neon green theme, 10x20 board (24px cells for 240x480 canvas)

// ====================== CONSTANTS ======================
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 24;
const COLORS = [
  null,
  '#00f0f0', // I cyan
  '#f0f000', // O yellow
  '#00f000', // S green
  '#0000f0', // Z blue
  '#f0a000', // L orange
  '#a000f0', // J purple
  '#f00000'  // T red
];

// Массив фигур: PIECES[тип][ротация] = форма
const PIECES = [
  // Type 1 - I
  [
    [[1,1,1,1]],
    [[1],[1],[1],[1]]
  ],
  // Type 2 - O
  [
    [[2,2],[2,2]]
  ],
  // Type 3 - S
  [
    [[0,3,3],[3,3,0]],
    [[3,0],[3,3],[0,3]]
  ],
  // Type 4 - Z
  [
    [[4,4,0],[0,4,4]],
    [[0,4],[4,4],[4,0]]
  ],
  // Type 5 - L
  [
    [[5,0],[5,0],[5,5]],
    [[0,0,5],[5,5,5]],
    [[5,5],[0,5],[0,5]],
    [[5,5,5],[5,0,0]]
  ],
  // Type 6 - J
  [
    [[0,6],[0,6],[6,6]],
    [[6,0,0],[6,6,6]],
    [[6,6],[6,0],[6,0]],
    [[6,6,6],[0,0,6]]
  ],
  // Type 7 - T
  [
    [[0,7,0],[7,7,7]],
    [[7,0],[7,7],[7,0]],
    [[7,7,7],[0,7,0]],
    [[0,7],[7,7],[0,7]]
  ]
];

// ====================== GLOBALS ======================
let ws = null;
let roomCode = null;
let myRole = null;
let myName = '';
let myGame = null;
let opponentGame = null;
let gameInterval = null;
let dropTime = 0;
let dropInterval = 1000;
let isPaused = false;

// ====================== WS UTILS ======================
function setStatus(text, color = '#0f0') {
  const el = document.getElementById('status');
  if (el) el.textContent = text, el.style.color = color;
}

function sendMove(move) {
  if (!myGame || !ws) return;
  
  console.log(`⬅️ Move: ${move}`);
  
  switch(move) {
    case 'left': myGame.move(-1, 0); break;
    case 'right': myGame.move(1, 0); break;
    case 'down': myGame.move(0, 1); break;
    case 'rotate': myGame.rotate(); break;
    case 'drop':
      while (!myGame.collides()) myGame.move(0, 1);
      myGame.merge();
      break;
  }
  
  if (ws && roomCode) {
    ws.send(JSON.stringify({
      type: 'gameState',
      code: roomCode,
      state: myGame.getState()
    }));
  }
}

let isReady = false;
let gameStarted = false;

function showLobby() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('lobby').style.display = 'block';
  document.getElementById('myNameLobby').textContent = myName;
}

function toggleReady() {
  isReady = !isReady;
  const btn = document.getElementById('readyBtn');
  btn.textContent = isReady ? 'Готов!' : 'Готов';
  btn.classList.toggle('ready');
  document.getElementById('myStatus').textContent = isReady ? 'Готов!' : 'Не готов';
  document.getElementById('myStatus').className = `status ${isReady ? 'ready' : 'wait'}`;
  if (ws) ws.send(JSON.stringify({type: 'ready', code: roomCode, ready: isReady}));
}

function startGame() {
  console.log('🎮 Starting game...');
  gameStarted = true;
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('gameArea').style.display = 'block';
  const oppName = document.getElementById('oppNameLobby').textContent;
  console.log(`📋 My role: ${myRole}, My name: ${myName}, Opponent: ${oppName}`);
  
  // Swap canvas для player2 - он видит себя справа, противника слева
  let myCanvasId = 'myCanvas';
  let oppCanvasId = 'opponentCanvas';
  let myNameBoardId = 'myNameBoard';
  let oppNameBoardId = 'opponentNameBoard';
  
  if (myRole === 'player2') {
    myCanvasId = 'opponentCanvas';
    oppCanvasId = 'myCanvas';
    myNameBoardId = 'opponentNameBoard';
    oppNameBoardId = 'myNameBoard';
    console.log('🔄 Swapped canvas for player2');
  }
  
  document.getElementById(myNameBoardId).textContent = myName;
  document.getElementById(oppNameBoardId).textContent = oppName;
  
  myGame = new TetrisGame(myCanvasId);
  opponentGame = new TetrisGame(oppCanvasId, true);
  
  myGame.init();
  opponentGame.init();
  console.log('✅ Games initialized');
  
  requestAnimationFrame(gameLoop);
}

// ====================== TETRIS CLASS ======================
class TetrisGame {
  constructor(canvasId, isOpponent = false) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    this.score = 0;
    this.lines = 0;
    this.piece = null;
    this.nextPiece = null;
    this.isOpponent = isOpponent;
    this.speed = 1000;
    this.lastDrop = 0;
  }

  init() {
    this.board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    this.score = 0;
    this.lines = 0;
    this.newPiece();
    this.updateUI();
    this.speed = 1000;
  }

  newPiece() {
    const type = Math.floor(Math.random() * 7); // 0-6
    const rotations = PIECES[type];
    const rot = 0;
    const shape = rotations[rot];
    this.piece = { type: type + 1, x: 3, y: 0, rot: rot, shape: shape };
    this.nextPiece = this.getRandomPiece();
    if (this.collides()) this.gameOver();
  }

  getRandomPiece() {
    const type = Math.floor(Math.random() * 7); // 0-6
    const rotations = PIECES[type];
    const rot = Math.floor(Math.random() * rotations.length);
    const shape = rotations[rot];
    return { type: type + 1, x: 3, y: 0, rot: rot, shape: shape };
  }

  collides() {
    for (let y = 0; y < this.piece.shape.length; y++) {
      for (let x = 0; x < this.piece.shape[y].length; x++) {
        if (this.piece.shape[y][x]) {
          const newX = this.piece.x + x;
          const newY = this.piece.y + y;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT || (newY >= 0 && this.board[newY][newX])) return true;
        }
      }
    }
    return false;
  }

  merge() {
    for (let y = 0; y < this.piece.shape.length; y++) {
      for (let x = 0; x < this.piece.shape[y].length; x++) {
        if (this.piece.shape[y][x]) {
          const ny = this.piece.y + y;
          const nx = this.piece.x + x;
          if (ny >= 0) this.board[ny][nx] = this.piece.type;
        }
      }
    }
    this.clearLines();
    this.newPiece();
  }

  clearLines() {
    let clearedLines = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== 0)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(BOARD_WIDTH).fill(0));
        this.lines++;
        clearedLines++;
        y++; // Re-check this line
      }
    }
    // Score multiplier based on lines cleared at once
    if (clearedLines > 0) {
      const scoreMap = [0, 40, 100, 300, 1200];
      this.score += scoreMap[Math.min(4, clearedLines)] * (1 + Math.floor(this.lines / 10) * 0.1);
    }
    this.speed = Math.max(50, 1000 - this.lines * 30);
  }

  rotate() {
    const typeIdx = this.piece.type - 1; // Convert to 0-based
    const rotations = PIECES[typeIdx];
    this.piece.rot = (this.piece.rot + 1) % rotations.length;
    this.piece.shape = rotations[this.piece.rot];
    if (this.collides()) {
      this.piece.rot = (this.piece.rot + rotations.length - 1) % rotations.length; // Revert
      this.piece.shape = rotations[this.piece.rot];
    }
  }

  move(dx, dy) {
    this.piece.x += dx;
    this.piece.y += dy;
    if (this.collides()) {
      this.piece.x -= dx;
      this.piece.y -= dy;
      if (dy > 0) this.merge();
    }
  }

  drop() {
    this.move(0, 1);
  }

  update(time) {
    if (!gameStarted) return;
    if (time - this.lastDrop > this.speed) {
      this.drop();
      this.lastDrop = time;
    }
  }

  aiMove() {
    // Simple AI: random left/right/rotate/down occasionally
    if (Math.random() < 0.02) sendMove(Math.random() < 0.5 ? 'left' : 'right');
    if (Math.random() < 0.01) sendMove('rotate');
    if (Math.random() < 0.03) sendMove('down');
  }

  updateUI() {
    const scoreEl = document.getElementById(this.isOpponent ? 'opponentScore' : 'myScore');
    const linesEl = document.getElementById(this.isOpponent ? 'opponentLines' : 'myLines');
    if (scoreEl) scoreEl.textContent = this.score;
    if (linesEl) linesEl.textContent = this.lines;
  }

  render() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (this.board[y][x]) {
          this.ctx.fillStyle = COLORS[this.board[y][x]];
          this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
          this.ctx.strokeStyle = '#333';
          this.ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }
    }

    // Piece
    if (this.piece) {
      this.ctx.fillStyle = COLORS[this.piece.type];
      for (let py = 0; py < this.piece.shape.length; py++) {
        for (let px = 0; px < this.piece.shape[py].length; px++) {
          if (this.piece.shape[py][px]) {
            this.ctx.fillRect((this.piece.x + px) * CELL_SIZE, (this.piece.y + py) * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
          }
        }
      }
    }

    this.updateUI();
  }

  getState() {
    return {board: this.board, piece: this.piece, score: this.score, lines: this.lines};
  }

  setState(state) {
    if (!state) return;
    this.board = state.board || this.board;
    this.score = state.score || 0;
    this.lines = state.lines || 0;
    
    // Синхронизируй piece полностью
    if (state.piece) {
      const typeIdx = state.piece.type - 1;
      const rotations = PIECES[typeIdx];
      const shape = rotations[state.piece.rot] || rotations[0];
      
      this.piece = {
        type: state.piece.type,
        x: state.piece.x,
        y: state.piece.y,
        rot: state.piece.rot,
        shape: shape
      };
    }
  }

  gameOver() {
    // Save score
    fetch('/api/scores', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: myName, score: this.score})
    });
    alert(`Game Over! Score: ${this.score}`);
    this.init();
  }
}

// ====================== WS FUNCTIONS ======================
function createRoom() {
  myName = prompt("Введи своё имя:", "Игрок") || "Игрок";
  console.log(`🔌 Connecting to ws://localhost:3000, name: ${myName}`);
  ws = new WebSocket('ws://localhost:3000');
  
  ws.onopen = () => {
    console.log('✅ WS connected, sending createRoom');
    ws.send(JSON.stringify({type: 'createRoom', name: myName}));
  };
  
  ws.onmessage = handleMessage;
  
  ws.onerror = (error) => {
    console.error('❌ WS Error:', error);
    alert('Ошибка подключения к серверу');
  };
  
  ws.onclose = () => {
    console.log('❌ WS closed');
  };
}

function joinAsPlayer() {
  const code = document.getElementById('roomInput').value.trim().toUpperCase();
  if (!code) return alert('Код комнаты!');
  myName = prompt("Имя:", "Игрок") || "Игрок";
  ws = new WebSocket('ws://localhost:3000');
  ws.onopen = () => ws.send(JSON.stringify({type: 'joinRoom', code, role: 'player2', name: myName}));
  ws.onmessage = handleMessage;
}

function joinAsSpectator() {
  const code = document.getElementById('roomInput').value.trim().toUpperCase();
  if (!code) return alert('Код комнаты!');
  myName = prompt("Имя (зритель):", "Зритель") || "Зритель";
  ws = new WebSocket('ws://localhost:3000');
  ws.onopen = () => ws.send(JSON.stringify({type: 'joinRoom', code, role: 'spectator', name: myName}));
  ws.onmessage = handleMessage;
}

function handleMessage(event) {
  const msg = JSON.parse(event.data);
  console.log('📨 Msg received:', msg);

  switch (msg.type) {
    case 'roomCreated':
      roomCode = msg.code;
      myRole = 'player1';
      console.log(`✅ Room created: ${roomCode}, I am player1`);
      document.getElementById('roomCode').textContent = msg.code;
      document.getElementById('roomCodeDisplay').style.display = 'block';
      document.getElementById('oppNameLobby').textContent = 'Противник ищется...';
      showLobby();
      break;
    case 'roomCode':
      document.getElementById('roomCode').textContent = msg.code;
      document.getElementById('roomCodeDisplay').style.display = 'block';
      break;
    case 'joined':
      roomCode = msg.code;
      myRole = msg.role;
      console.log(`✅ Joined room: ${roomCode}, I am ${msg.role}, opponent: ${msg.opponent}`);
      document.getElementById('oppNameLobby').textContent = msg.opponent || 'AI';
      showLobby();
      break;
    case 'playerJoined':
      console.log(`🎮 Player joined: ${msg.name}`);
      document.getElementById('oppNameLobby').textContent = msg.name;
      document.getElementById('oppStatus').textContent = 'Ждёт...';
      break;
    case 'playerReady':
      console.log(`😎 Player ready: ${msg.ready}`);
      document.getElementById('oppStatus').textContent = msg.ready ? 'Готов!' : 'Не готов';
      document.getElementById('oppStatus').className = `status ${msg.ready ? 'ready' : 'wait'}`;
      break;
    case 'countdown': {
      console.log(`⏱ Countdown: ${msg.count}`);
      const cd = document.getElementById('countdown');
      cd.style.display = 'block';
      cd.textContent = msg.count;
      if (msg.count === 0) setTimeout(startGame, 500);
      break;
    }
    case 'startGame':
      console.log(`🎮 Game start!`);
      startGame();
      break;
    case 'gameState':
      if (opponentGame) {
        const pieceBefore = opponentGame.piece ? `${opponentGame.piece.type}@(${opponentGame.piece.x},${opponentGame.piece.y})` : 'none';
        opponentGame.setState(msg.state);
        const pieceAfter = opponentGame.piece ? `${opponentGame.piece.type}@(${opponentGame.piece.x},${opponentGame.piece.y})` : 'none';
        document.getElementById('opponentScore').textContent = opponentGame.score;
        document.getElementById('opponentLines').textContent = opponentGame.lines;
        console.log(`📊 Opponent: piece ${pieceBefore}→${pieceAfter}, score=${opponentGame.score}, lines=${opponentGame.lines}`);
      }
      break;
    case 'reaction':
      console.log('Reaction:', msg.reaction);
      break;
    case 'error':
      setStatus(msg.message, 'red');
      break;
  }
}

function sendReaction(emoji) {
  if (ws) ws.send(JSON.stringify({type: 'reaction', code: roomCode, reaction: emoji}));
}

function sendState() {
  if (myGame && ws && gameStarted) {
    ws.send(JSON.stringify({
      type: 'gameState',
      code: roomCode,
      state: myGame.getState()
    }));
  }
}

function leaveRoom() {
  if (ws) ws.close();
  location.reload();
}

// ====================== INPUT ======================
document.addEventListener('keydown', (e) => {
  if (!myGame) return;
  switch(e.key) {
    case 'ArrowLeft': sendMove('left'); break;
    case 'ArrowRight': sendMove('right'); break;
    case 'ArrowDown': sendMove('down'); break;
    case 'ArrowUp': sendMove('rotate'); break;
    case ' ': sendMove('drop'); break;
  }
});

// ====================== GAME LOOP ======================
let lastTime = 0;
let lastSyncTime = 0;
function gameLoop(time = 0) {
  if (myGame && gameStarted) {
    myGame.update(time);
    myGame.render();
  }
  if (opponentGame && gameStarted) {
    opponentGame.render();
  }
  
  // Отправляй состояние регулярно (каждые 100ms)
  if (gameStarted && time - lastSyncTime > 100) {
    sendState();
    lastSyncTime = time;
  }
  
  requestAnimationFrame(gameLoop);
}

// ====================== LEADERBOARD ======================
if (window.location.pathname.includes('leaderboard.html')) {
  fetch('/api/top10')
    .then(res => res.json())
    .then(scores => {
      const table = document.getElementById('leaderboard');
      table.innerHTML = '<tr><th>Место</th><th>Игрок</th><th>Очки</th><th>Дата</th></tr>';
      scores.forEach((s, i) => {
        const row = table.insertRow();
        row.innerHTML = `<td>${i+1}</td><td>${s.name}</td><td>${s.score}</td><td>${new Date(s.created_at).toLocaleString()}</td>`;
      });
    });
}

window.onload = () => {
  console.log('Tetris ready!');
  // Add copyCode to global for onclick
  window.copyCode = copyCode;
};

