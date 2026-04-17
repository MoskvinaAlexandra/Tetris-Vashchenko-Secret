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

export async function handleJoinRoom(ws, msg, roomManager) {
  try {
    const room = roomManager.getRoom(msg.code);
    if (!room) {
      ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
      return;
    }

    ws.currentRoom = msg.code;

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
        code: msg.code,
        player1Name: room.player1?.name || 'Игрок 1',
        player2Name: room.player2?.name || 'Игрок 2'
      }));

      roomManager.broadcastRoomState(msg.code);
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
      lastState: slot?.lastState || null
    };

    ws.role = resolvedRole;
    roomManager.clearReconnectTimer(msg.code, resolvedRole);

    const opponentRole = resolvedRole === 'player1' ? 'player2' : 'player1';
    const opponent = room[opponentRole];

    ws.send(JSON.stringify({
      type: 'joined',
      role: resolvedRole,
      code: msg.code,
      opponent: opponent?.name || null
    }));

    roomManager.broadcastRoomState(msg.code);

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
