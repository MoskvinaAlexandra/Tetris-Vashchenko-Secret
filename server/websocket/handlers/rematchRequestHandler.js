import { WebSocket } from 'ws';

export async function handleRematchRequest(ws, msg, rooms) {
  const room = rooms.get(msg.code);
  if (!room || !room.matchCompleted || !room.player1 || !room.player2) {
    return;
  }

  if (ws.role !== 'player1' && ws.role !== 'player2') {
    return;
  }

  room.rematchVotes.add(ws.role);

  const clients = [room.player1.ws, room.player2.ws, ...Array.from(room.spectators).map((spectator) => spectator.ws)];

  if (room.rematchVotes.size < 2) {
    clients.forEach((client) => {
      if (client?.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'rematchStatus',
          waitingFor: client === ws ? 'opponent' : 'you',
          requestedBy: ws.role
        }));
      }
    });
    return;
  }

  room.match = null;
  room.matchStarted = false;
  room.matchCompleted = false;
  room.player1.ready = false;
  room.player2.ready = false;
  room.rematchVotes.clear();

  clients.forEach((client) => {
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'rematchLobby',
        code: msg.code,
        player1Name: room.player1.name,
        player2Name: room.player2.name,
        message: 'Комната готова к реваншу. Нажмите "Готов", когда будете готовы к следующей дуэли.'
      }));
    }
  });
}
