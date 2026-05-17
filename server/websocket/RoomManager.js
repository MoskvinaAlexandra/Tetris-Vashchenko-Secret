import { RoomService } from '../services/RoomService.js';
import { ReconnectionHandler } from './ReconnectionHandler.js';
import { RoomBroadcaster } from './RoomBroadcaster.js';
import { ForfeitHandler } from './ForfeitHandler.js';
import { DisconnectHandler } from './DisconnectHandler.js';
import { logger } from '../utils/logger.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.reconnectionHandler = new ReconnectionHandler();
    this.broadcaster = new RoomBroadcaster(this);
    this.forfeitHandler = new ForfeitHandler(this, this.broadcaster);
    this.disconnectHandler = new DisconnectHandler(this, this.broadcaster, this.forfeitHandler);
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  addRoom(code, room) {
    this.rooms.set(code, room);
  }

  getRoomClients(room) {
    return this.broadcaster.getRoomClients(room);
  }

  buildRoomState(code) {
    return this.broadcaster.buildRoomState(code);
  }

  broadcastToRoom(code, payload, excludeSocket = null) {
    this.broadcaster.broadcastToRoom(code, payload, excludeSocket);
  }

  broadcastRoomState(code) {
    this.broadcaster.broadcastRoomState(code);
  }

  scheduleReconnectTimeout(code, role) {
    this.reconnectionHandler.scheduleTimeout(code, role, async () => {
      const room = this.rooms.get(code);
      if (!room) return;
      const slot = room[role];
      if (!slot || slot.connected) return;
      room[role] = null;
      this.broadcastRoomState(code);
      await this.cleanupRoomIfEmpty(code);
    });
  }

  async cleanupRoomIfEmpty(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    const hasConnectedPlayers = [room.player1, room.player2].some((player) => player?.connected);
    const hasReservedPlayers = [room.player1, room.player2].some((player) => player && !player.connected);
    const hasSpectators = room.spectators.size > 0;
    if (!hasConnectedPlayers && !hasReservedPlayers && !hasSpectators) {
      await this.removeRoom(code);
    }
  }

  async removeRoom(code) {
    try {
      this.reconnectionHandler.clearTimer(code, 'player1');
      this.reconnectionHandler.clearTimer(code, 'player2');
      await RoomService.endRoom(code);
      this.rooms.delete(code);
      logger.info(`Room ${code} deleted`);
    } catch (err) {
      logger.error(`Failed to delete room ${code}:`, err);
    }
  }

  async finishByForfeit(code, loserRole, reason = 'left') {
    await this.forfeitHandler.finishByForfeit(code, loserRole, reason);
  }

  async handleSocketClose(ws, options = {}) {
    await this.disconnectHandler.handleSocketClose(ws, options);
  }
}

