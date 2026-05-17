export class DisconnectHandler {
  constructor(roomManager, broadcaster, forfeitHandler) {
    this.roomManager = roomManager;
    this.broadcaster = broadcaster;
    this.forfeitHandler = forfeitHandler;
  }

  async handleSocketClose(ws, { intentional = false } = {}) {
    if (!ws || ws._disconnectHandled) return;
    ws._disconnectHandled = true;

    const code = ws.currentRoom;
    if (!code) return;

    const room = this.roomManager.rooms.get(code);
    if (!room) return;

    if (ws.role === 'spectator') {
      await this.handleSpectatorDisconnect(ws, room, code);
      return;
    }

    if (ws.role !== 'player1' && ws.role !== 'player2') {
      await this.roomManager.cleanupRoomIfEmpty(code);
      return;
    }

    await this.handlePlayerDisconnect(ws, room, code, intentional);
  }

  async handleSpectatorDisconnect(ws, room, code) {
    const spectatorToDelete = Array.from(room.spectators).find(
      (spectator) => spectator.ws === ws || spectator.playerId === ws.playerId
    );
    if (spectatorToDelete) {
      room.spectators.delete(spectatorToDelete);
    }
    this.broadcaster.broadcastRoomState(code);
    await this.roomManager.cleanupRoomIfEmpty(code);
  }

  async handlePlayerDisconnect(ws, room, code, intentional) {
    const role = ws.role;
    const slot = room[role];

    if (!slot || slot.playerId !== ws.playerId) {
      await this.roomManager.cleanupRoomIfEmpty(code);
      return;
    }

    const matchInProgress = room.gameLive && !room.matchCompleted;
    if (matchInProgress) {
      await this.forfeitHandler.finishByForfeit(code, role, intentional ? 'left' : 'disconnect');
      return;
    }

    if (intentional) {
      this.handleIntentionalLeave(room, code, role);
    } else {
      this.handleUnintentionalDisconnect(room, code, role, slot);
    }

    this.broadcaster.broadcastRoomState(code);
    await this.roomManager.cleanupRoomIfEmpty(code);
  }

  handleIntentionalLeave(room, code, role) {
    room[role] = null;
    this.roomManager.reconnectionHandler.clearTimer(code, role);
  }

  handleUnintentionalDisconnect(room, code, role, slot) {
    room[role] = {
      ...slot,
      ws: null,
      connected: false
    };
    this.roomManager.scheduleReconnectTimeout(code, role);
  }
}
