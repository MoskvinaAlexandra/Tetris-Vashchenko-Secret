import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());
import pool from './db.js';

const wss = new WebSocketServer({ server: httpServer });

const rooms = new Map(); // roomCode → { player1, player2, spectators: Set(), names: {} }

wss.on('connection', (ws) => {
    console.log('Новый клиент подключился');

    let currentRoom = null;
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`Message:`, msg);

            if (msg.type === 'createRoom') {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                rooms.set(code, {
                    player1: ws,
                    player2: null,
                    spectators: new Set(),
                    names: { player1: msg.name },
                    gameStates: { player1: null, player2: null }
                });
                ws.send(JSON.stringify({ type: 'roomCreated', code, role: 'player1' }));
                currentRoom = code;
                console.log(`Room ${code} created`);
            } else if (msg.type === 'joinRoom') {
                const room = rooms.get(msg.code);
                if (!room) return ws.send(JSON.stringify({ type: 'error', message: 'Комната не найдена' }));
                currentRoom = msg.code;

                if (msg.role === 'player2' && !room.player2) {
                    room.player2 = ws;
                    room.names.player2 = msg.name;
                    // Отправляем player1 сообщение о присоединении player2
                    if (room.player1 && room.player1.readyState === WebSocket.OPEN) {
                        room.player1.send(JSON.stringify({ type: 'playerJoined', code: msg.code, name: msg.name }));
                    }
                    // Отправляем player2 подтверждение присоединения
                    ws.send(JSON.stringify({ type: 'joined', role: 'player2', code: msg.code, opponent: room.names.player1 }));
                    console.log(`Player2 ${msg.name} присоединился к комнате ${msg.code}`);
                } else if (msg.role === 'spectator') {
                    room.spectators.add(ws);
                    ws.send(JSON.stringify({ 
                        type: 'joined', 
                        role: 'spectator', 
                        code: msg.code,
                        player1Name: room.names.player1 || 'Игрок 1',
                        player2Name: room.names.player2 || 'Игрок 2'
                    }));
                    console.log(`Зритель${msg.name ? ' ' + msg.name : ''} присоединился к комнате ${msg.code}`);
                }
            } else if (msg.type === 'move' && msg.code) {
                const room = rooms.get(msg.code);
                if (room) {
                    // Broadcast move/state to room
                    const senderRole = room.player1 === ws ? 'player1' : room.player2 === ws ? 'player2' : null;
                    const stateMsg = { type: 'gameState', state: msg.state || {}, senderRole: senderRole };
                    [room.player1, room.player2, ...room.spectators].forEach(client => {
                        if (client && client !== ws && client.readyState === WebSocket.OPEN) client.send(JSON.stringify(stateMsg));
                    });
                }
            } else if (msg.type === 'gameState' && msg.code) {
                const room = rooms.get(msg.code);
                if (room) {
                    console.log(`📊 Received gameState from room ${msg.code}, broadcasting...`);
                    // Determine which player sent this state
                    const senderRole = room.player1 === ws ? 'player1' : room.player2 === ws ? 'player2' : null;
                    // Broadcast game state to all EXCEPT sender
                    const stateMsg = { type: 'gameState', state: msg.state, senderRole: senderRole };
                    [room.player1, room.player2, ...room.spectators].forEach(client => {
                        if (client && client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(stateMsg));
                        }
                    });
                }
            } else if (msg.type === 'ready' && msg.code) {
                const room = rooms.get(msg.code);
                if (room) {
                    const playerKey = room.player1 === ws ? 'player1' : 'player2';
                    room.ready = room.ready || {};
                    room.ready[playerKey] = msg.ready;
                    
                    // Notify other player
                    const otherPlayer = room.player1 === ws ? room.player2 : room.player1;
                    if (otherPlayer && otherPlayer.readyState === WebSocket.OPEN) {
                        otherPlayer.send(JSON.stringify({
                            type: 'playerReady',
                            ready: msg.ready,
                            code: msg.code
                        }));
                    }
                    
                    // Check if both ready
                    if (room.player2 && room.ready.player1 && room.ready.player2) {
                        // Countdown
                        let count = 3;
                        const countdownInterval = setInterval(() => {
                            [room.player1, room.player2, ...room.spectators].forEach(client => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({type: 'countdown', count, code: msg.code}));
                                }
                            });
                            count--;
                            if (count < 0) {
                                clearInterval(countdownInterval);
                                [room.player1, room.player2, ...room.spectators].forEach(client => {
                                    if (client.readyState === WebSocket.OPEN) {
                                        client.send(JSON.stringify({
                                            type: 'startGame', 
                                            code: msg.code,
                                            player1Name: room.names.player1 || 'Игрок 1',
                                            player2Name: room.names.player2 || 'Игрок 2'
                                        }));
                                    }
                                });
                            }
                        }, 1000);
                    }
                }
            } else if (msg.type === 'reaction' && msg.code) {
                const room = rooms.get(msg.code);
                if (room) {
                    const reactionMsg = { type: 'reaction', reaction: msg.reaction };
                    [room.player1, room.player2, ...room.spectators].forEach(client => {
                        if (client.readyState === WebSocket.OPEN && client !== ws) {
                            client.send(JSON.stringify(reactionMsg));
                        }
                    });
                }
            }
        } catch (e) {
            console.error('WS Error:', e);
        }
    });

    ws.on('close', () => {
        // Cleanup room if empty
        for (let [code, room] of rooms) {
            if (room.player1 === ws) {
                room.player1 = null;
                console.log(`Player1 вышел из комнаты ${code}`);
            }
            if (room.player2 === ws) {
                room.player2 = null;
                console.log(`Player2 вышел из комнаты ${code}`);
            }
            room.spectators.delete(ws);
            
            // Удаляем пустую комнату
            if (!room.player1 && !room.player2 && room.spectators.size === 0) {
                rooms.delete(code);
                console.log(`Комната ${code} удалена`);
            }
        }
    });


});

// API Routes
app.post('/api/scores', async (req, res) => {
  try {
    const { name, score } = req.body;
    await pool.query('INSERT INTO scores (name, score, created_at) VALUES ($1, $2, NOW())', [name, score]);
    res.json({success: true});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.get('/api/top10', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, score, created_at FROM scores ORDER BY score DESC LIMIT 10');
    res.json(result.rows);
  } catch (e) {
    res.json([]);
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Сервер на http://localhost:${PORT}`);
    console.log(`WS: ws://localhost:${PORT}`);
});
