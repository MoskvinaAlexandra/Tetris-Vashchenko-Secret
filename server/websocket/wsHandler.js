import { authenticateWS } from '../middleware/authMiddleware.js';
import { handleCreateRoom } from './handlers/createRoomHandler.js';
import { handleJoinRoom } from './handlers/joinRoomHandler.js';
import { handleReady } from './handlers/readyHandler.js';
import { handleGameState } from './handlers/gameStateHandler.js';
import { handleGameEnd } from './handlers/gameEndHandler.js';
import { handleReaction } from './handlers/reactionHandler.js';
import { handleRematchRequest } from './handlers/rematchRequestHandler.js';
import { WebSocket } from 'ws';

export async function handleWSMessage(ws, msg, roomManager) {
  try {
    if (msg.type !== 'ping') {
      const auth = authenticateWS(msg);
      if (!auth) {
        ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
        return;
      }
      ws.playerId = auth.playerId;
    }

    switch (msg.type) {
      case 'createRoom':
        await handleCreateRoom(ws, msg, roomManager);
        break;
      case 'joinRoom':
        await handleJoinRoom(ws, msg, roomManager);
        break;
      case 'leaveRoom':
        await roomManager.handleSocketClose(ws, { intentional: true });
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'left room');
        }
        break;
      case 'ready':
        await handleReady(ws, msg, roomManager);
        break;
      case 'gameState':
        await handleGameState(ws, msg, roomManager);
        break;
      case 'gameEnd':
        await handleGameEnd(ws, msg, roomManager);
        break;
      case 'reaction':
        await handleReaction(ws, msg, roomManager);
        break;
      case 'rematchRequest':
        await handleRematchRequest(ws, msg, roomManager);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        break;
    }
  } catch (error) {
    console.error('WS handler error:', error);
    ws.send(JSON.stringify({ type: 'error', message: 'Server error' }));
  }
}
