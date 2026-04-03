const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const PHASE = {
    WAITING: "waiting",
    PLAYING: "playing",
    READY: "ready",
    FINISHED: "finished"
};

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});

const rooms = new Map();

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
        roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
}

wss.on('connection', /** @param {import('ws').WebSocket} socket */ (socket) => {
    console.log('Игрок подключился');

    socket.on('message', (message) => {
        let msg;
        try {
            msg = JSON.parse(message);
        } catch (e) {
            console.error('Неверный формат сообщения');
            return;
        }

        switch (msg.type) {
            case 'createGame':
                handleCreateGame(socket);
                break;
            case 'joinGame':
                handleJoinGame(socket, msg.roomId);
                break;
            case 'makeAction':
                handleMakeMove(socket, msg.roomId, msg.action);
                break;
            case 'surrender':
                handleSurrender(socket, msg.roomId);
                break;
            case 'spectate':
                handleSpectate(socket, msg.roomId);
                break;
            default:
                console.error('Неизвестный тип сообщения');
        }
    });
    socket.on('close', () => {
        console.log('Игрок отключился');
        handleDisconnect(socket);
    });
});

function handleCreateGame(socket) {
    const roomId = generateRoomId();
    const data = {
        roomId: roomId,
        phase: PHASE.WAITING,
        round: 1,
        player1: {
            socket: socket,
            name: "Player 1",
            field: {},
        },
        player2: {
            socket: null,
            name: "Player 2",
            field: {},
        },
        spectators: new Set(),///мб не set
    };
    rooms.set(roomId, data);
    socket?.send(JSON.stringify({type: "gameCreated", roomId: roomId, message: `Комната создана. Ваш ID комнаты: ${roomId}. Ожидание второго игрока...`}));
}

function handleJoinGame(socket, roomId) {
    const room = rooms.get(roomId);
    if (!room) {
        socket?.send(JSON.stringify({type: 'error', message: 'Комната не найдена'}));
        return;
    }
    if (room.phase !== PHASE.WAITING) {
        socket?.send(JSON.stringify({type: 'error', message: 'Комната уже заполнена'}));
        return;
    }
    if (room.player1.socket === socket || room.player2.socket === socket) {
        socket?.send(JSON.stringify({type: 'error', message: 'Вы уже в этой комнате'}));
        return;
    }
    if (!room.player1.socket) {
        room.player1.socket = socket;
        room.player2.socket?.send(JSON.stringify({type: 'gameStart', message: 'Второй игрок присоединился. Игра начинается!'}));
        room.player1.socket?.send(JSON.stringify({type: 'gameStart', message: 'Вы присоединились к игре!'}));
    } else if (!room.player2.socket) {
        room.player2.socket = socket;
        room.player1.socket?.send(JSON.stringify({type: 'gameStart', message: 'Второй игрок присоединился. Игра начинается!'}));
        room.player2.socket?.send(JSON.stringify({type: 'gameStart', message: 'Вы присоединились к игре!'}));
    }
    room.phase = PHASE.READY;
}

function handleDisconnect(socket) {
    for (const [roomId, room] of rooms) {
        if (room.player1.socket === socket) {
            room.player1.socket = null;
            //что делать с комнатой, если игрок отключился? удалять её или ждать его возвращения?(ждать таймаут какой-то и удалять комнату, 30 секунд?)
            break;
        } else if (room.player2.socket === socket) {
            room.player2.socket = null;
            break;
        }
    }
}
///reconnect надо бы, но непонятно, что пока по авторизации и id игроков(по нику будем определять)

function handleSpectate(socket, roomId) {
    const room = rooms.get(roomId);
    if (!room) {
        socket?.send(JSON.stringify({type: 'error', message: 'Комната не найдена'}));
        return;
    }
    room.spectators.add(socket);
    socket?.send(JSON.stringify({type: 'spectateJoined', roomId:roomId, message: `Вы наблюдаете за игрой в комнате ${roomId}`}));
    socket?.send(JSON.stringify({type: 'gameState', state: getGameState(room)}));
}

function getGameState(room) {
    return {
        phase: room.phase,
        round: room.round,
        player1: {
            name: 'Player 1',
        },
        player2: {
            name: 'Player 2',
        },
        //тут логика для полей и прочего, что нужно отправлять игрокам и зрителям
    }
}

//функция для отправки обновленного состояния игры всем участникам комнаты (игрокам и зрителям)
function broadcastGameState(room, msg) {
    const data = JSON.stringify(msg);
    if (room.player1.socket) {
        room.player1.socket?.send(data);
    }
    if (room.player2.socket) {
        room.player2.socket?.send(data);
    }
    cleanupSpectators(room)
    for (const spectator of room.spectators) {
        if(spectator.readyState === WebSocket.OPEN) {
            spectator?.send(data);
        }
    }
}

function cleanupSpectators(room) {
    for (const s of room.spectators) {
        if (s.readyState !== WebSocket.OPEN) {
            room.spectators.delete(s);
        }
    }
}

function handleMakeMove(socket, roomId, action) {

}

function handleSurrender(socket, roomId) {

}