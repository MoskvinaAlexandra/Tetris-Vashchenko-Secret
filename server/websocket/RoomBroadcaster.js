import { WebSocket } from 'ws';
import { RoomStateSerializer } from './RoomStateSerializer.js';

export class RoomBroadcaster {
  constructor(roomManager) {
    this.roomManager = roomManager;
  }

  getRoomClients(room) {
    const sockets = [
      room.player1?.ws,
      room.player2?.ws,
      ...Array.from(room.spectators).map((spectator) => spectator.ws)
    ];
    return sockets.filter((client) => client?.readyState === WebSocket.OPEN);
  }

  buildRoomState(code) {
    const room = this.roomManager.rooms.get(code);
    return RoomStateSerializer.buildRoomState(room, code);
  }

  broadcastToRoom(code, payload, excludeSocket = null) {
    const room = this.roomManager.rooms.get(code);
    if (!room) return;
    const message = JSON.stringify(payload);
    this.getRoomClients(room).forEach((client) => {
      if (excludeSocket && client === excludeSocket) return;
      client.send(message);
    });
  }

  broadcastRoomState(code) {
    const state = this.buildRoomState(code);
    if (!state) return;
    this.broadcastToRoom(code, state);
  }
}
