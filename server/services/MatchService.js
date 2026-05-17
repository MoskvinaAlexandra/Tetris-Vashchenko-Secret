import pool from '../db.js';
import { PlayerStatsService } from './PlayerStatsService.js';
import { LeaderboardService } from './LeaderboardService.js';

export class MatchService {
  static async createMatch(roomCode, player1Id, player2Id) {
    try {
      const result = await pool.query(
        `INSERT INTO matches (room_code, player1_id, player2_id, played_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING match_id, room_code, player1_id, player2_id`,
        [roomCode, player1Id, player2Id]
      );
      return result.rows[0];
    } catch (err) {
      throw new Error(`Failed to create match: ${err.message}`);
    }
  }

  static async updateMatchResult(matchId, player1Score, player2Score, player1Lines, player2Lines, durationSeconds) {
    try {
      const match = await this.getMatch(matchId);
      let winnerId = null;
      if (player1Score > player2Score) {
        winnerId = match.player1_id;
      } else if (player2Score > player1Score) {
        winnerId = match.player2_id;
      }
      await pool.query(
        `UPDATE matches
         SET player1_score = $1, player2_score = $2, player1_lines = $3, player2_lines = $4,
             duration_seconds = $5, winner_id = $6
         WHERE match_id = $7`,
        [player1Score, player2Score, player1Lines, player2Lines, durationSeconds, winnerId, matchId]
      );
      const updatedMatch = await this.getMatch(matchId);
      await PlayerStatsService.updatePlayerStats(matchId, updatedMatch);
    } catch (err) {
      throw new Error(`Failed to update match: ${err.message}`);
    }
  }

  static async getMatch(matchId) {
    const result = await pool.query(
      `SELECT * FROM matches WHERE match_id = $1`,
      [matchId]
    );
    if (result.rows.length === 0) {
      throw new Error('Match not found');
    }
    return result.rows[0];
  }

  static async getPlayerMatches(playerId, limit = 20) {
    const result = await pool.query(
      `SELECT m.*, p1.name as player1_name, p2.name as player2_name, pw.name as winner_name
       FROM matches m
       LEFT JOIN players p1 ON m.player1_id = p1.player_id
       LEFT JOIN players p2 ON m.player2_id = p2.player_id
       LEFT JOIN players pw ON m.winner_id = pw.player_id
       WHERE m.player1_id = $1 OR m.player2_id = $1
       ORDER BY m.played_at DESC
       LIMIT $2`,
      [playerId, limit]
    );
    return result.rows;
  }

  static async getLeaderboard(sortBy, limit) {
    return LeaderboardService.getLeaderboard(sortBy, limit);
  }
}
