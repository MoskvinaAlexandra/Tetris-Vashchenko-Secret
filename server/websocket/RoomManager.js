import { RoomService } from '../services/RoomService.js';
import { MatchService } from '../services/MatchService.js';
import { WebSocket } from 'ws';

const RECONNECT_TIMEOUT_MS = 30_000;

export class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.reconnectTimers = new Map();
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  addRoom(code, room) {
    this.rooms.set(code, room);
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
    const room = this.rooms.get(code);
    if (!room) return null;

    const serializePlayer = (player) => {
      if (!player) return null;
      return {
        playerId: player.playerId,
        name: player.name,
        ready: Boolean(player.ready),
        connected: Boolean(player.connected)
      };
    };

    return {
      type: 'roomState',
      code,
      players: {
        player1: serializePlayer(room.player1),
        player2: serializePlayer(room.player2)
      },
      spectators: Array.from(room.spectators).map((spectator) => ({
        playerId: spectator.playerId,
        name: spectator.name
      })),
      matchStarted: Boolean(room.matchStarted),
      gameLive: Boolean(room.gameLive)
    };
  }

  broadcastToRoom(code, payload, excludeSocket = null) {
    const room = this.rooms.get(code);
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

  clearReconnectTimer(code, role) {
    const key = `${code}:${role}`;
    const timer = this.reconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(key);
    }
  }

  scheduleReconnectTimeout(code, role) {
    this.clearReconnectTimer(code, role);

    const key = `${code}:${role}`;
    const timer = setTimeout(async () => {
      const room = this.rooms.get(code);
      if (!room) return;

      const slot = room[role];
      if (!slot || slot.connected) return;

      room[role] = null;
      this.broadcastRoomState(code);
      await this.cleanupRoomIfEmpty(code);
    }, RECONNECT_TIMEOUT_MS);

    this.reconnectTimers.set(key, timer);
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
      this.clearReconnectTimer(code, 'player1');
      this.clearReconnectTimer(code, 'player2');
      await RoomService.endRoom(code);
      this.rooms.delete(code);
      console.log(`Room ${code} deleted`);
    } catch (err) {
      console.error(`Failed to delete room ${code}:`, err);
    }
  }

  async finishByForfeit(code, loserRole, reason = 'left') {
    const room = this.rooms.get(code);
    if (!room || room.matchCompleted || !room.player1 || !room.player2) {
      return;
    }

    const winnerRole = loserRole === 'player1' ? 'player2' : 'player1';
    const winner = room[winnerRole];
    const loser = room[loserRole];
    if (!winner || !loser) {
      return;
    }

    room.matchCompleted = true;
    room.matchStarted = false;
    room.gameLive = false;
    room.player1.ready = false;
    room.player2.ready = false;
    room.rematchVotes.clear();

    const winnerState = winner.lastState || { score: 0, lines: 0 };
    const loserState = loser.lastState || { score: 0, lines: 0 };
    const player1Score = loserRole === 'player1' ? loserState.score || 0 : Math.max(1, winnerState.score || 0);
    const player2Score = loserRole === 'player2' ? loserState.score || 0 : Math.max(1, winnerState.score || 0);
    const player1Lines = loserRole === 'player1' ? loserState.lines || 0 : winnerState.lines || 0;
    const player2Lines = loserRole === 'player2' ? loserState.lines || 0 : winnerState.lines || 0;

    try {
      if (!room.match) {
        room.match = await MatchService.createMatch(code, room.player1.playerId, room.player2.playerId);
      }

      await MatchService.updateMatchResult(
        room.match.match_id,
        player1Score,
        player2Score,
        player1Lines,
        player2Lines,
        0
      );
    } catch (error) {
      console.error('Failed to persist forfeit result:', error.message);
    }

    this.broadcastToRoom(code, {
      type: 'matchEnded',
      winner: winnerRole,
      winnerName: winner.name,
      player1Score,
      player2Score,
      byForfeit: true,
      reason
    });

    this.broadcastToRoom(code, {
      type: 'roomClosed',
      reason: 'player_left',
      message: 'Матч завершён досрочно: соперник покинул игру.'
    });

    await this.removeRoom(code);
  }

  async handleSocketClose(ws, { intentional = false } = {}) {
    if (!ws || ws._disconnectHandled) return;
    ws._disconnectHandled = true;

    const code = ws.currentRoom;
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    if (ws.role === 'spectator') {
      const spectatorToDelete = Array.from(room.spectators).find(
        (spectator) => spectator.ws === ws || spectator.playerId === ws.playerId
      );
      if (spectatorToDelete) {
        room.spectators.delete(spectatorToDelete);
      }
      this.broadcastRoomState(code);
      await this.cleanupRoomIfEmpty(code);
      return;
    }

    if (ws.role !== 'player1' && ws.role !== 'player2') {
      await this.cleanupRoomIfEmpty(code);
      return;
    }

    const role = ws.role;
    const slot = room[role];
    if (!slot || slot.playerId !== ws.playerId) {
      await this.cleanupRoomIfEmpty(code);
      return;
    }

    const matchInProgress = room.gameLive && !room.matchCompleted;
    if (matchInProgress) {
      await this.finishByForfeit(code, role, intentional ? 'left' : 'disconnect');
      return;
    }

    if (intentional) {
      room[role] = null;
      this.clearReconnectTimer(code, role);
    } else {
      room[role] = {
        ...slot,
        ws: null,
        connected: false,
        ready: false
      };
      this.scheduleReconnectTimeout(code, role);
    }

    if (room.countdownTimer) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
      room.matchStarted = false;
      room.gameLive = false;
      room.match = null;
    }

    this.broadcastRoomState(code);
    await this.cleanupRoomIfEmpty(code);
  }
}
