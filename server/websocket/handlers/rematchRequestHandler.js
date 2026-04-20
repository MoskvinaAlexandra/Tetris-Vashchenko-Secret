export async function handleRematchRequest(ws, msg, roomManager) {
  const room = roomManager.getRoom(msg.code);
  if (!room || !room.matchCompleted || !room.player1 || !room.player2) {
    return;
  }

  if (ws.role !== 'player1' && ws.role !== 'player2') {
    return;
  }

  room.rematchVotes.add(ws.role);

  if (room.rematchVotes.size < 2) {
    roomManager.broadcastToRoom(msg.code, {
      type: 'rematchStatus',
      requestedBy: ws.role
    });
    return;
  }

  room.match = null;
  room.matchStarted = false;
  room.gameLive = false;
  room.matchCompleted = false;
  room.seed = null;
  room.player1.ready = false;
  room.player2.ready = false;
  room.player1.lastState = null;
  room.player2.lastState = null;
  room.player1.lastGameState = null;
  room.player2.lastGameState = null;
  room.rematchVotes.clear();

  roomManager.broadcastToRoom(msg.code, {
    type: 'rematchLobby',
    code: msg.code,
    player1Name: room.player1.name,
    player2Name: room.player2.name,
    message: 'Комната готова к реваншу. Нажмите "Готов", когда будете готовы к следующей дуэли.'
  });

  roomManager.broadcastRoomState(msg.code);
}
