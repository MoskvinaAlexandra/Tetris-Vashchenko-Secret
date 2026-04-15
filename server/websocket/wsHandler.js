import { authenticateWS } from '../middleware/authMiddleware.js';
import { handleCreateRoom } from './handlers/createRoomHandler.js';
import { handleJoinRoom } from './handlers/joinRoomHandler.js';
import { handleReady } from './handlers/readyHandler.js';
import { handleGameState } from './handlers/gameStateHandler.js';
import { handleGameEnd } from './handlers/gameEndHandler.js';
import { handleReaction } from './handlers/reactionHandler.js';
import { handleRematchRequest } from './handlers/rematchRequestHandler.js';

export async function handleWSMessage(ws, msg, rooms) {
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
        await handleCreateRoom(ws, msg, rooms);
        break;
      case 'joinRoom':
        await handleJoinRoom(ws, msg, rooms);
        break;
      case 'ready':
        await handleReady(ws, msg, rooms);
        break;
      case 'gameState':
        await handleGameState(ws, msg, rooms);
        break;
      case 'gameEnd':
        await handleGameEnd(ws, msg, rooms);
        break;
      case 'reaction':
        await handleReaction(ws, msg, rooms);
        break;
      case 'rematchRequest':
        await handleRematchRequest(ws, msg, rooms);
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
