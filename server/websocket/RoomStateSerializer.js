export class RoomStateSerializer {
  static serializePlayer(player) {
    if (!player) return null;
    return {
      playerId: player.playerId,
      name: player.name,
      ready: Boolean(player.ready),
      connected: Boolean(player.connected)
    };
  }

  static buildRoomState(room, code) {
    if (!room) return null;
    return {
      type: 'roomState',
      code,
      players: {
        player1: this.serializePlayer(room.player1),
        player2: this.serializePlayer(room.player2)
      },
      spectators: Array.from(room.spectators).map((spectator) => ({
        playerId: spectator.playerId,
        name: spectator.name
      })),
      matchStarted: Boolean(room.matchStarted),
      gameLive: Boolean(room.gameLive)
    };
  }
}
