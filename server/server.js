import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import authRoutes from './routes/auth.js';
import playerRoutes from './routes/player.js';
import leaderboardRoutes from './routes/leaderboard.js';
import { handleWSMessage } from './websocket/wsHandler.js';
import { RoomManager } from './websocket/RoomManager.js';
import pool from './db.js';
import { logger } from './utils/logger.js';

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
  logger.info('New WebSocket client connected');
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      await handleWSMessage(ws, msg, roomManager);
    } catch (err) {
      logger.error('WS Parse Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });
  ws.on('close', async () => {
    logger.info('Client disconnected');
    await roomManager.handleSocketClose(ws, { intentional: false });
  });
  ws.on('error', (err) => {
    logger.error('WS Error:', err);
  });
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`WebSocket ready on ws://localhost:${PORT}`);
});
const CLEANUP_INTERVAL_HOURS = 1;
const CLEANUP_INTERVAL_MS = CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
const ROOM_EXPIRY_HOURS = 24;
setInterval(async () => {
  try {
    const result = await pool.query(
      `DELETE FROM rooms
       WHERE is_active = false
       AND ended_at < NOW() - INTERVAL $1`,
      [`${ROOM_EXPIRY_HOURS} hours`]
    );
    if (result.rowCount > 0) {
      logger.info(`Cleaned up ${result.rowCount} old rooms`);
    }
  } catch (err) {
    logger.error('Failed to cleanup old rooms:', err.message);
  }
}, CLEANUP_INTERVAL_MS);
logger.info(`Room cleanup scheduled: every ${CLEANUP_INTERVAL_MS / 1000 / 60} minutes`);