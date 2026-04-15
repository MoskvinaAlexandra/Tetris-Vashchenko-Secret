// server/websocket/RoomManager.js — Manage active rooms
import { RoomService } from '../services/RoomService.js';
import { WebSocket } from 'ws';

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Get room by code
   */
  getRoom(code) {
    return this.rooms.get(code);
  }

  /**
   * Add room
   */
  addRoom(code, room) {
    this.rooms.set(code, room);
  }

  /**
   * Remove room
   */
  async removeRoom(code) {
    try {
      await RoomService.endRoom(code);
      this.rooms.delete(code);
      console.log(`🗑️ Room ${code} deleted`);
    } catch (err) {
      console.error(`❌ Failed to delete room ${code}:`, err);
    }
  }

  /**
   * Clean up on client disconnect
   */
  async handleClientDisconnect(playerId, currentRoom) {
    if (!currentRoom) return;

    const room = this.rooms.get(currentRoom);
    if (!room) return;

    // Remove player from room
    if (room.player1?.playerId === playerId) {
      room.player1 = null;
    } else if (room.player2?.playerId === playerId) {
      room.player2 = null;
    } else {
      room.spectators.forEach(s => {
        if (s.playerId === playerId) {
          room.spectators.delete(s);
        }
      });
    }

    // End room if empty
    if (!room.player1 && !room.player2 && room.spectators.size === 0) {
      await this.removeRoom(currentRoom);
    }
  }
}

