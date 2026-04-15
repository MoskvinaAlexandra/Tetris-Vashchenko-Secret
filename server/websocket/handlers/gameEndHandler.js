import { MatchService } from '../../services/MatchService.js';
import { WebSocket } from 'ws';

export async function handleGameEnd(ws, msg, rooms) {
  const room = rooms.get(msg.code);
  if (!room || !room.match || room.matchCompleted) {
    return;
  }

  room.matchCompleted = true;
  room.matchStarted = false;
  room.player1.ready = false;
  room.player2.ready = false;
  room.rematchVotes.clear();

  try {
    const player1Score = msg.player1Score || 0;
    const player2Score = msg.player2Score || 0;
    const durationSeconds = msg.duration || 0;

    await MatchService.updateMatchResult(
      room.match.match_id,
      player1Score,
      player2Score,
      msg.player1Lines || 0,
      msg.player2Lines || 0,
      durationSeconds
    );

    const winner = player1Score >= player2Score ? 'player1' : 'player2';
    const winnerName = winner === 'player1' ? room.player1.name : room.player2.name;
    const clients = [room.player1.ws, room.player2.ws, ...Array.from(room.spectators).map((spectator) => spectator.ws)];

    clients.forEach((client) => {
      if (client?.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'matchEnded',
          winner,
          winnerName,
          player1Score,
          player2Score
        }));
      }
    });
  } catch (error) {
    console.error('Game end error:', error);
  }
}
