import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import playerRoutes from './routes/player.js';
import leaderboardRoutes from './routes/leaderboard.js';
import { handleWSMessage } from './websocket/wsHandler.js';
import { RoomManager } from './websocket/RoomManager.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const roomManager = new RoomManager();

app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      await handleWSMessage(ws, msg, roomManager);
    } catch (err) {
      console.error('WS Parse Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', async () => {
    console.log('Client disconnected');
    await roomManager.handleSocketClose(ws, { intentional: false });
  });

  ws.on('error', (err) => {
    console.error('WS Error:', err);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready on ws://localhost:${PORT}`);
});
