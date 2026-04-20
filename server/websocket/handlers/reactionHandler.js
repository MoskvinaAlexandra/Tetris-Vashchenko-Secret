import { WebSocket } from 'ws';

function resolveSenderRole(room, ws) {
  const wsPlayerId = String(ws.playerId ?? '');
  if (String(room.player1?.playerId ?? '') === wsPlayerId) return 'player1';
  if (String(room.player2?.playerId ?? '') === wsPlayerId) return 'player2';

  const isSpectator = Array.from(room.spectators).some(
    (spectator) => String(spectator.playerId ?? '') === wsPlayerId
  );
  if (isSpectator) return 'spectator';

  return null;
}

export async function handleReaction(ws, msg, roomManager) {
  const code = String(msg.code || ws.currentRoom || '').trim().toUpperCase();
  const room = roomManager.getRoom(code);
  if (!room) return;

  const senderRole = resolveSenderRole(room, ws) || ws.role;
  if (!senderRole) return;

  const normalizedTargetRole = String(msg.targetRole || '').trim().toLowerCase();
  let targetRole = null;
  if (normalizedTargetRole === 'player1' || normalizedTargetRole === 'player2') {
    targetRole = normalizedTargetRole;
  } else if (senderRole === 'player1' || senderRole === 'player2') {
    targetRole = senderRole;
  } else {
    targetRole = 'player1';
  }

  const payload = {
    type: 'reaction',
    reaction: msg.reaction,
    from: msg.name,
    senderRole,
    targetRole
  };

  roomManager.broadcastToRoom(code, payload);
}
