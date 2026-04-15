import { RoomService } from '../../services/RoomService.js';

export async function handleCreateRoom(ws, msg, rooms) {
  try {
    const playerId = ws.playerId;
    const room = await RoomService.createRoom(playerId);
    const roomCode = room.room_code;

    rooms.set(roomCode, {
      player1: { ws, playerId, name: msg.name, ready: false },
      player2: null,
      spectators: new Set(),
      match: null,
      matchStarted: false,
      matchCompleted: false,
      rematchVotes: new Set()
    });

    ws.currentRoom = roomCode;
    ws.role = 'player1';

    ws.send(JSON.stringify({
      type: 'roomCreated',
      code: roomCode,
      role: 'player1',
      message: `Room created. Share code: ${roomCode}`
    }));
  } catch (error) {
    console.error('Create room error:', error);
    ws.send(JSON.stringify({ type: 'error', message: error.message }));
  }
}
