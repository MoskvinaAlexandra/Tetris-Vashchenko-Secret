import { RoomService } from '../../services/RoomService.js';

export async function handleCreateRoom(ws, msg, roomManager) {
  try {
    const playerId = ws.playerId;
    const room = await RoomService.createRoom(playerId);
    const roomCode = room.room_code;

    roomManager.addRoom(roomCode, {
      player1: {
        ws,
        playerId,
        name: msg.name,
        ready: false,
        connected: true,
        lastState: null
      },
      player2: null,
      spectators: new Set(),
      match: null,
      matchStarted: false,
      gameLive: false,
      matchCompleted: false,
      rematchVotes: new Set(),
      countdownTimer: null,
      seed: null
    });

    ws.currentRoom = roomCode;
    ws.role = 'player1';

    ws.send(JSON.stringify({
      type: 'roomCreated',
      code: roomCode,
      role: 'player1',
      message: `Room created. Share code: ${roomCode}`
    }));

    roomManager.broadcastRoomState(roomCode);
  } catch (error) {
    console.error('Create room error:', error);
    ws.send(JSON.stringify({ type: 'error', message: error.message }));
  }
}
