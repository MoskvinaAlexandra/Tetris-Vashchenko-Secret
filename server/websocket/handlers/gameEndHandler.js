import { MatchService } from '../../services/MatchService.js';
export async function handleGameEnd(ws, msg, roomManager) {
  const room = roomManager.getRoom(msg.code);
  if (!room || !room.match || room.matchCompleted || !room.player1 || !room.player2) {
    return;
  }
  room.matchCompleted = true;
  room.matchStarted = false;
  room.gameLive = false;
  room.player1.ready = false;
  room.player2.ready = false;
  room.rematchVotes.clear();
  try {
    const player1Score = Number(msg.player1Score) || 0;
    const player2Score = Number(msg.player2Score) || 0;
    const durationSeconds = Number(msg.duration) || 0;
    await MatchService.updateMatchResult(
      room.match.match_id,
      player1Score,
      player2Score,
      Number(msg.player1Lines) || 0,
      Number(msg.player2Lines) || 0,
      durationSeconds
    );
    let winner = null;
    let winnerName = null;
    if (player1Score > player2Score) {
      winner = 'player1';
      winnerName = room.player1.name;
    } else if (player2Score > player1Score) {
      winner = 'player2';
      winnerName = room.player2.name;
    }
    roomManager.broadcastToRoom(msg.code, {
      type: 'matchEnded',
      winner,
      winnerName,
      player1Score,
      player2Score
    });
    roomManager.broadcastRoomState(msg.code);
  } catch (error) {
    console.error('Game end error:', error);
  }
}