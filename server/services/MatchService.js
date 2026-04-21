import pool from '../db.js';

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
      const winnerId = player1Score >= player2Score ? match.player1_id : match.player2_id;

      await pool.query(
        `UPDATE matches 
         SET player1_score = $1, player2_score = $2, player1_lines = $3, player2_lines = $4, 
             duration_seconds = $5, winner_id = $6
         WHERE match_id = $7`,
        [player1Score, player2Score, player1Lines, player2Lines, durationSeconds, winnerId, matchId]
      );

      await this.updatePlayerStats(matchId);
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

  static async updatePlayerStats(matchId) {
    try {
      const match = await this.getMatch(matchId);
      const { player1_id, player2_id, player1_score, player2_score, player1_lines, player2_lines, winner_id } = match;

      const isPlayer1Winner = winner_id === player1_id;
      const winnerId = isPlayer1Winner ? player1_id : player2_id;
      const loserId = isPlayer1Winner ? player2_id : player1_id;

      await pool.query(
        `UPDATE player_stats
         SET wins = wins + 1,
             games_played = games_played + 1,
             total_score = total_score + $1,
             total_lines_cleared = total_lines_cleared + $2,
             best_score = GREATEST(best_score, $1),
             best_lines = GREATEST(best_lines, $2),
             avg_score = ROUND(total_score::decimal / (games_played + 1), 2),
             updated_at = NOW()
         WHERE player_id = $3`,
        [isPlayer1Winner ? player1_score : player2_score,
         isPlayer1Winner ? player1_lines : player2_lines,
         winnerId]
      );

      await pool.query(
        `UPDATE player_stats
         SET losses = losses + 1,
             games_played = games_played + 1,
             total_score = total_score + $1,
             total_lines_cleared = total_lines_cleared + $2,
             best_score = GREATEST(best_score, $1),
             best_lines = GREATEST(best_lines, $2),
             avg_score = ROUND(total_score::decimal / (games_played + 1), 2),
             updated_at = NOW()
         WHERE player_id = $3`,
        [isPlayer1Winner ? player2_score : player1_score,
         isPlayer1Winner ? player2_lines : player1_lines,
         loserId]
      );
    } catch (err) {
      console.error('Failed to update player stats:', err.message);
    }
  }

  /**
   * Get leaderboard
   * @param {string} sortBy - 'best_score', 'wins', or 'games_played'
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getLeaderboard(sortBy = 'best_score', limit = 100) {
    const validSortFields = ['best_score', 'wins', 'games_played', 'total_score', 'avg_score'];
    if (!validSortFields.includes(sortBy)) {
      sortBy = 'best_score';
    }

    const result = await pool.query(
      `SELECT ps.*, p.name, p.created_at
       FROM player_stats ps
       JOIN players p ON ps.player_id = p.player_id
       WHERE ps.games_played > 0
       ORDER BY ps.${sortBy} DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
}

