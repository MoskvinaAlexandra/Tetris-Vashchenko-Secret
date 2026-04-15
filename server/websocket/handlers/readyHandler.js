import { MatchService } from '../../services/MatchService.js';
import { WebSocket } from 'ws';

export async function handleReady(ws, msg, rooms) {
  const room = rooms.get(msg.code);
  if (!room || !room.player1 || !room.player2) {
    return;
  }

  if (room.matchStarted) {
    return;
  }

  room.matchCompleted = false;
  room.rematchVotes.clear();

  if (ws.role === 'player1') {
    room.player1.ready = msg.ready;
  } else if (ws.role === 'player2') {
    room.player2.ready = msg.ready;
  }

  const other = ws.role === 'player1' ? room.player2 : room.player1;
  if (other?.ws?.readyState === WebSocket.OPEN) {
    other.ws.send(JSON.stringify({ type: 'playerReady', ready: msg.ready }));
  }

  if (room.player1.ready && room.player2.ready) {
    try {
      room.matchStarted = true;
      room.matchCompleted = false;
      room.match = await MatchService.createMatch(msg.code, room.player1.playerId, room.player2.playerId);

      let count = 3;
      const clients = [room.player1.ws, room.player2.ws, ...Array.from(room.spectators).map((spectator) => spectator.ws)];

      const countdownInterval = setInterval(() => {
        clients.forEach((client) => {
          if (client?.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'countdown', count }));
          }
        });

        count -= 1;

        if (count < 0) {
          clearInterval(countdownInterval);
          clients.forEach((client) => {
            if (client?.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'startGame',
                code: msg.code,
                player1Name: room.player1.name,
                player2Name: room.player2.name
              }));
            }
          });
        }
      }, 1000);
    } catch (error) {
      room.matchStarted = false;
      room.matchCompleted = false;
      console.error('Match creation error:', error);
    }
  }
}
