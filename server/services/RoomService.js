// server/services/RoomService.js — Room management (SOLID principle)
import pool from '../db.js';

export class RoomService {
  /**
   * Generate random room code (6 characters)
   * @returns {string}
   */
  static generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Create a new room
   * @param {number} createdByPlayerId
   * @returns {Promise<{room_code, created_by_player_id, created_at, is_active}>}
   */
  static async createRoom(createdByPlayerId) {
    const roomCode = this.generateRoomCode();

    try {
      const result = await pool.query(
        `INSERT INTO rooms (room_code, created_by_player_id, created_at, is_active)
         VALUES ($1, $2, NOW(), true)
         RETURNING room_code, created_by_player_id, created_at, is_active`,
        [roomCode, createdByPlayerId]
      );
      return result.rows[0];
    } catch (err) {
      throw new Error(`Failed to create room: ${err.message}`);
    }
  }

  /**
   * Add participant to room
   * @param {string} roomCode
   * @param {number} playerId
   * @param {string} role - 'player1', 'player2', or 'spectator'
   * @returns {Promise<void>}
   */
  static async addParticipant(roomCode, playerId, role) {
    try {
      await pool.query(
        `INSERT INTO room_participants (room_code, player_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())`,
        [roomCode, playerId, role]
      );
    } catch (err) {
      throw new Error(`Failed to add participant: ${err.message}`);
    }
  }

  /**
   * Get room by code
   * @param {string} roomCode
   * @returns {Promise<{room_code, created_by_player_id, created_at, is_active, ended_at}>}
   */
  static async getRoom(roomCode) {
    const result = await pool.query(
      `SELECT room_code, created_by_player_id, created_at, is_active, ended_at FROM rooms WHERE room_code = $1`,
      [roomCode]
    );

    if (result.rows.length === 0) {
      throw new Error('Room not found');
    }

    return result.rows[0];
  }

  /**
   * Get room participants
   * @param {string} roomCode
   * @returns {Promise<Array>}
   */
  static async getParticipants(roomCode) {
    const result = await pool.query(
      `SELECT rp.id, rp.player_id, rp.role, rp.joined_at, p.name
       FROM room_participants rp
       JOIN players p ON rp.player_id = p.player_id
       WHERE rp.room_code = $1 AND rp.left_at IS NULL
       ORDER BY rp.joined_at ASC`,
      [roomCode]
    );

    return result.rows;
  }

  /**
   * Remove participant from room
   * @param {string} roomCode
   * @param {number} playerId
   */
  static async removeParticipant(roomCode, playerId) {
    try {
      await pool.query(
        `UPDATE room_participants SET left_at = NOW()
         WHERE room_code = $1 AND player_id = $2 AND left_at IS NULL`,
        [roomCode, playerId]
      );
    } catch (err) {
      throw new Error(`Failed to remove participant: ${err.message}`);
    }
  }

  /**
   * End room
   * @param {string} roomCode
   */
  static async endRoom(roomCode) {
    try {
      await pool.query(
        `UPDATE rooms SET is_active = false, ended_at = NOW()
         WHERE room_code = $1`,
        [roomCode]
      );
    } catch (err) {
      throw new Error(`Failed to end room: ${err.message}`);
    }
  }

  /**
   * Get active rooms
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getActiveRooms(limit = 50) {
    const result = await pool.query(
      `SELECT room_code, created_by_player_id, created_at, is_active
       FROM rooms
       WHERE is_active = true AND created_at > NOW() - INTERVAL '1 hour'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
}

