import { WebSocket } from 'ws';
import { logger } from '../../utils/logger.js';

function resolvePlayerRole(room, wsPlayerId, requestedRole) {
  if (room.player1?.playerId === wsPlayerId) return 'player1';
  if (room.player2?.playerId === wsPlayerId) return 'player2';
  if (requestedRole === 'player1' && !room.player1) return 'player1';
  if (requestedRole === 'player2' && !room.player2) return 'player2';
  if (requestedRole === 'player' || requestedRole === 'player2') {
    if (!room.player2) return 'player2';
    if (!room.player1) return 'player1';
  }
  return null;
}

function sendOngoingMatchSnapshot(ws, room, code) {
  if (!room.gameLive) {
    return;
  }
  ws.send(JSON.stringify({
    type: 'startGame',
    code,
    player1Name: room.player1?.name || 'Player 1',
    player2Name: room.player2?.name || 'Player 2',
    seed: room.seed
  }));
  if (room.player1?.lastGameState) {
    ws.send(JSON.stringify({
      type: 'gameState',
      senderRole: 'player1',
      state: room.player1.lastGameState
    }));
  }
  if (room.player2?.lastGameState) {
    ws.send(JSON.stringify({
      type: 'gameState',
      senderRole: 'player2',
      state: room.player2.lastGameState
    }));
  }
}

function buildJoinedSnapshot(room) {
  return {
    gameLive: Boolean(room.gameLive),
    matchStarted: Boolean(room.matchStarted),
    seed: room.seed || null,
    player1State: room.player1?.lastGameState || null,
    player2State: room.player2?.lastGameState || null
  };
}

function handleSpectatorJoin(ws, msg, room, code, roomManager) {
  const existingSpectator = Array.from(room.spectators).find(
    (spectator) => spectator.playerId === ws.playerId
  );
  if (existingSpectator) {
    room.spectators.delete(existingSpectator);
  }
  room.spectators.add({ ws, playerId: ws.playerId, name: msg.name });
  ws.role = 'spectator';
  
  ws.send(JSON.stringify({
    type: 'joined',
    role: 'spectator',
    code,
    player1Name: room.player1?.name || 'Player 1',
    player2Name: room.player2?.name || 'Player 2',
    ...buildJoinedSnapshot(room)
  }));
  
  sendOngoingMatchSnapshot(ws, room, code);
  roomManager.broadcastRoomState(code);
}

function validatePlayerSlot(room, resolvedRole, ws) {
  const slot = room[resolvedRole];
  if (slot && slot.playerId !== ws.playerId) {
    return { valid: false, error: 'Slot is occupied by another player' };
  }
  return { valid: true, slot };
}

function assignPlayerToSlot(room, resolvedRole, ws, msg, slot) {
  room[resolvedRole] = {
    ws,
    playerId: ws.playerId,
    name: slot?.name || msg.name,
    ready: false,
    connected: true,
    lastState: slot?.lastState || null,
    lastGameState: slot?.lastGameState || null
  };
  ws.role = resolvedRole;
}

function notifyOpponentOfJoin(room, resolvedRole, slot) {
  const opponentRole = resolvedRole === 'player1' ? 'player2' : 'player1';
  const opponent = room[opponentRole];
  
  if (!slot && opponent?.ws?.readyState === WebSocket.OPEN) {
    opponent.ws.send(JSON.stringify({
      type: 'playerJoined',
      role: resolvedRole,
      name: room[resolvedRole].name
    }));
  }
}

function handlePlayerJoin(ws, msg, room, code, roomManager, resolvedRole) {
  const validation = validatePlayerSlot(room, resolvedRole, ws);
  if (!validation.valid) {
    ws.send(JSON.stringify({ type: 'error', message: validation.error }));
    return;
  }
  
  assignPlayerToSlot(room, resolvedRole, ws, msg, validation.slot);
  roomManager.clearReconnectTimer(code, resolvedRole);
  
  const opponentRole = resolvedRole === 'player1' ? 'player2' : 'player1';
  const opponent = room[opponentRole];
  
  ws.send(JSON.stringify({
    type: 'joined',
    role: resolvedRole,
    code,
    opponent: opponent?.name || null,
    ...buildJoinedSnapshot(room)
  }));
  
  sendOngoingMatchSnapshot(ws, room, code);
  roomManager.broadcastRoomState(code);
  notifyOpponentOfJoin(room, resolvedRole, validation.slot);
}

export async function handleJoinRoom(ws, msg, roomManager) {
  try {
    const code = String(msg.code || '').trim().toUpperCase();
    const room = roomManager.getRoom(code);
    
    if (!room) {
      ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
      return;
    }
    
    ws.currentRoom = code;
    
    if (msg.role === 'spectator') {
      handleSpectatorJoin(ws, msg, room, code, roomManager);
      return;
    }
    
    const resolvedRole = resolvePlayerRole(room, ws.playerId, msg.role);
    if (!resolvedRole) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid role or slot taken' }));
      return;
    }
    
    handlePlayerJoin(ws, msg, room, code, roomManager, resolvedRole);
  } catch (error) {
    logger.error('Join room error:', error);
    ws.send(JSON.stringify({ type: 'error', message: error.message }));
  }
}
