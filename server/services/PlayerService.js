import pool from '../db.js';
import bcrypt from 'bcrypt';

export class PlayerService {
  static async register(name, email, password) {
    if (!name || name.length < 3 || name.length > 50) {
      throw new Error('Name must be 3-50 characters');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const result = await pool.query(
        `INSERT INTO players (name, email, password_hash, created_at, last_active_at) 
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING player_id, name, email, created_at`,
        [name, email, hashedPassword]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new Error('Username or email already taken');
      }
      throw err;
    }
  }

  static async authenticate(nameOrEmail, password) {
    const result = await pool.query(
      `SELECT player_id, name, email, password_hash FROM players 
       WHERE name = $1 OR email = $1`,
      [nameOrEmail]
    );

    if (result.rows.length === 0) {
      throw new Error('Player not found');
    }

    const player = result.rows[0];
    const passwordValid = await bcrypt.compare(password, player.password_hash);

    if (!passwordValid) {
      throw new Error('Invalid password');
    }

    // Update last_active_at
    await pool.query(
      `UPDATE players SET last_active_at = NOW() WHERE player_id = $1`,
      [player.player_id]
    );

    const { password_hash, ...playerData } = player;
    return playerData;
  }

  static async getById(playerId) {
    const result = await pool.query(
      `SELECT player_id, name, email, created_at, last_active_at FROM players WHERE player_id = $1`,
      [playerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Player not found');
    }

    return result.rows[0];
  }

  static async getStats(playerId) {
    const result = await pool.query(
      `SELECT * FROM player_stats WHERE player_id = $1`,
      [playerId]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO player_stats (player_id, total_score, wins, losses, games_played, total_lines_cleared, best_score, best_lines, avg_score)
         VALUES ($1, 0, 0, 0, 0, 0, 0, 0, 0)`,
        [playerId]
      );
      return {
        player_id: playerId,
        total_score: 0,
        wins: 0,
        losses: 0,
        games_played: 0,
        total_lines_cleared: 0,
        best_score: 0,
        best_lines: 0,
        avg_score: 0
      };
    }

    return result.rows[0];
  }

  static async updateLastActive(playerId) {
    await pool.query(
      `UPDATE players SET last_active_at = NOW() WHERE player_id = $1`,
      [playerId]
    );
  }
}

