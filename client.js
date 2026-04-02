const socket = new WebSocket("ws://localhost:3000");
let roomId = null;
let gameState = null;
socket.onopen = () => {
    console.log("Подключение установлено");
}
socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
        case 'gameCreated':
            roomId = msg.roomId;
            console.log(`Игра создана. Код комнаты: ${roomId}`);
            break;
        case 'gameJoined':
            roomId = msg.roomId;
            console.log(`Присоединились к игре. Код комнаты: ${roomId}`);
            break;
        case 'gameStarted':
            console.log("Игра началась", gameState);
            break;
        case 'spectateJoined':
            console.log("Вы наблюдаете за игрой", gameState);
            break;
        case 'error':
            console.error("Ошибка:", msg.message);
            break;
        default:
            console.log("Получено сообщение:", msg);
    }
}

function createGame() {
    socket.send(JSON.stringify({
        type: "createGame"
    }));
}

function joinGame(room) {
    roomId = room;

    socket.send(JSON.stringify({
        type: "joinGame",
        roomId
    }));
}

function spectate(room) {
    roomId = room;

    socket.send(JSON.stringify({
        type: "spectate",
        roomId
    }));
}

function makeAction(action) {
    socket.send(JSON.stringify({
        type: "makeAction",
        roomId,
        action
    }));
}

function surrender() {
    socket.send(JSON.stringify({
        type: "surrender",
        roomId
    }));
}

//ограничение частоты обновления до 60 кадров в секунду(чтобы все были в равных условиях, а не зависеть от производительности устройства)
const MAX_FPS = 60;
const FRAME_INTERVAL_MS = 1000 / MAX_FPS;
let previousTimeMs = 0;

function update() {
    requestAnimationFrame((currentTimeMs) => {
        const deltaTimeMs = currentTimeMs - previousTimeMs;
        if (deltaTimeMs >= FRAME_INTERVAL_MS) {
            updatePhysics();
            previousTimeMs = currentTimeMs - (deltaTimeMs % FRAME_INTERVAL_MS); //сложная логика для точного расчета времени, чтобы избежать накопления ошибок при длительной работе(https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/)
        }

        draw();
        update();
    });
}
