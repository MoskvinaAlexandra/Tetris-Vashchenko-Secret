import pool from '../db.js';
import { logger } from '../utils/logger.js';

export class PlayerStatsService {
  static async updatePlayerStats(matchId, match) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { player1_id, player2_id, player1_score, player2_score, player1_lines, player2_lines, winner_id } = match;
      
      if (winner_id === null) {
        await this.updateDrawStats(client, player1_id, player1_score, player1_lines);
        await this.updateDrawStats(client, player2_id, player2_score, player2_lines);
      } else {
        await this.updateWinLossStats(client, match);
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to update player stats:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateDrawStats(client, playerId, score, lines) {
    await client.query(
      `UPDATE player_stats
       SET games_played = games_played + 1,
           total_score = total_score + $1,
           total_lines_cleared = total_lines_cleared + $2,
           best_score = GREATEST(best_score, $1),
           best_lines = GREATEST(best_lines, $2),
           avg_score = ROUND((total_score + $1)::decimal / (games_played + 1), 2),
           updated_at = NOW()
       WHERE player_id = $3`,
      [score, lines, playerId]
    );
  }

  static async updateWinLossStats(client, match) {
    const { player1_id, player2_id, player1_score, player2_score, player1_lines, player2_lines, winner_id } = match;
    const isPlayer1Winner = winner_id === player1_id;
    const winnerId = isPlayer1Winner ? player1_id : player2_id;
    const loserId = isPlayer1Winner ? player2_id : player1_id;
    const winnerScore = isPlayer1Winner ? player1_score : player2_score;
    const winnerLines = isPlayer1Winner ? player1_lines : player2_lines;
    const loserScore = isPlayer1Winner ? player2_score : player1_score;
    const loserLines = isPlayer1Winner ? player2_lines : player1_lines;

    await this.updateWinnerStats(client, winnerId, winnerScore, winnerLines);
    await this.updateLoserStats(client, loserId, loserScore, loserLines);
  }

  static async updateWinnerStats(client, winnerId, score, lines) {
    await client.query(
      `UPDATE player_stats
       SET wins = wins + 1,
           games_played = games_played + 1,
           total_score = total_score + $1,
           total_lines_cleared = total_lines_cleared + $2,
           best_score = GREATEST(best_score, $1),
           best_lines = GREATEST(best_lines, $2),
           avg_score = ROUND((total_score + $1)::decimal / (games_played + 1), 2),
           updated_at = NOW()
       WHERE player_id = $3`,
      [score, lines, winnerId]
    );
  }

  static async updateLoserStats(client, loserId, score, lines) {
    await client.query(
      `UPDATE player_stats
       SET losses = losses + 1,
           games_played = games_played + 1,
           total_score = total_score + $1,
           total_lines_cleared = total_lines_cleared + $2,
           best_score = GREATEST(best_score, $1),
           best_lines = GREATEST(best_lines, $2),
           avg_score = ROUND((total_score + $1)::decimal / (games_played + 1), 2),
           updated_at = NOW()
       WHERE player_id = $3`,
      [score, lines, loserId]
    );
  }
}
