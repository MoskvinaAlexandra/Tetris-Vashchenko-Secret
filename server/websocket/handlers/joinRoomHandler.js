import { WebSocket } from 'ws';

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
    player1Name: room.player1?.name || 'Игрок 1',
    player2Name: room.player2?.name || 'Игрок 2',
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
      const existingSpectator = Array.from(room.spectators).find((spectator) => spectator.playerId === ws.playerId);
      if (existingSpectator) {
        room.spectators.delete(existingSpectator);
      }

      room.spectators.add({ ws, playerId: ws.playerId, name: msg.name });
      ws.role = 'spectator';

      ws.send(JSON.stringify({
        type: 'joined',
        role: 'spectator',
        code,
        player1Name: room.player1?.name || 'Игрок 1',
        player2Name: room.player2?.name || 'Игрок 2',
        ...buildJoinedSnapshot(room)
      }));

      sendOngoingMatchSnapshot(ws, room, code);
      roomManager.broadcastRoomState(code);
      return;
    }

    const resolvedRole = resolvePlayerRole(room, ws.playerId, msg.role);
    if (!resolvedRole) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid role or slot taken' }));
      return;
    }

    const slot = room[resolvedRole];
    if (slot && slot.playerId !== ws.playerId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Slot is occupied by another player' }));
      return;
    }

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

    if (!slot && opponent?.ws?.readyState === WebSocket.OPEN) {
      opponent.ws.send(JSON.stringify({
        type: 'playerJoined',
        role: resolvedRole,
        name: room[resolvedRole].name
      }));
    }
  } catch (error) {
    console.error('Join room error:', error);
    ws.send(JSON.stringify({ type: 'error', message: error.message }));
  }
}
