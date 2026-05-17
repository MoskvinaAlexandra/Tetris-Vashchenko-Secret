import { MatchService } from '../services/MatchService.js';
import { logger } from '../utils/logger.js';

export class ForfeitHandler {
  constructor(roomManager, broadcaster) {
    this.roomManager = roomManager;
    this.broadcaster = broadcaster;
  }

  async finishByForfeit(code, loserRole, reason = 'left') {
    const room = this.roomManager.rooms.get(code);
    if (!room || room.matchCompleted || !room.player1 || !room.player2) {
      return;
    }

    const winnerRole = loserRole === 'player1' ? 'player2' : 'player1';
    const winner = room[winnerRole];
    const loser = room[loserRole];

    if (!winner || !loser) {
      return;
    }

    this.markMatchAsCompleted(room);
    const scores = this.calculateScores(room, loserRole, winner, loser);
    await this.persistMatchResult(room, code, scores);
    this.notifyClients(code, winnerRole, winner, scores, reason);
    await this.roomManager.removeRoom(code);
  }

  markMatchAsCompleted(room) {
    room.matchCompleted = true;
    room.matchStarted = false;
    room.gameLive = false;
    room.player1.ready = false;
    room.player2.ready = false;
    room.rematchVotes.clear();
  }

  calculateScores(room, loserRole, winner, loser) {
    const winnerState = winner.lastState || { score: 0, lines: 0 };
    const loserState = loser.lastState || { score: 0, lines: 0 };

    return {
      player1Score: loserRole === 'player1' ? loserState.score || 0 : winnerState.score || 0,
      player2Score: loserRole === 'player2' ? loserState.score || 0 : winnerState.score || 0,
      player1Lines: loserRole === 'player1' ? loserState.lines || 0 : winnerState.lines || 0,
      player2Lines: loserRole === 'player2' ? loserState.lines || 0 : winnerState.lines || 0
    };
  }

  async persistMatchResult(room, code, scores) {
    try {
      if (!room.match) {
        room.match = await MatchService.createMatch(code, room.player1.playerId, room.player2.playerId);
      }
      await MatchService.updateMatchResult(
        room.match.match_id,
        scores.player1Score,
        scores.player2Score,
        scores.player1Lines,
        scores.player2Lines,
        0
      );
    } catch (error) {
      logger.error('Failed to persist forfeit result:', error);
    }
  }

  notifyClients(code, winnerRole, winner, scores, reason) {
    this.broadcaster.broadcastToRoom(code, {
      type: 'matchEnded',
      winner: winnerRole,
      winnerName: winner.name,
      player1Score: scores.player1Score,
      player2Score: scores.player2Score,
      byForfeit: true,
      reason
    });

    this.broadcaster.broadcastToRoom(code, {
      type: 'roomClosed',
      reason: 'player_left',
      message: 'Матч завершён досрочно: соперник покинул игру.'
    });
  }
}
