import pool from '../db.js';

export class LeaderboardService {
  static async getLeaderboard(sortBy = 'best_score', limit = 100) {
    const allowedSorts = ['best_score', 'wins', 'games_played', 'total_score', 'avg_score'];
    const validSort = allowedSorts.includes(sortBy) ? sortBy : 'best_score';
    
    const validLimit = Math.max(1, Math.min(parseInt(limit, 10) || 100, 1000));
    
    const columnMap = {
      'best_score': 'ps.best_score',
      'wins': 'ps.wins',
      'games_played': 'ps.games_played',
      'total_score': 'ps.total_score',
      'avg_score': 'ps.avg_score'
    };
    
    const orderColumn = columnMap[validSort];
    
    const result = await pool.query(
      `SELECT ps.*, p.name, p.created_at
       FROM player_stats ps
       JOIN players p ON ps.player_id = p.player_id
       WHERE ps.games_played > 0
       ORDER BY ${orderColumn} DESC
       LIMIT $1`,
      [validLimit]
    );
    return result.rows;
  }
}
