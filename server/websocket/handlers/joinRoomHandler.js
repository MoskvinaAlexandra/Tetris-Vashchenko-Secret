import { WebSocket } from 'ws';

export async function handleJoinRoom(ws, msg, rooms) {
  try {
    const room = rooms.get(msg.code);
    if (!room) {
      ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
      return;
    }

    ws.currentRoom = msg.code;
    ws.role = msg.role;

    if (msg.role === 'player2' && !room.player2) {
      room.player2 = { ws, playerId: ws.playerId, name: msg.name, ready: false };

      if (room.player1?.ws?.readyState === WebSocket.OPEN) {
        room.player1.ws.send(JSON.stringify({
          type: 'playerJoined',
          role: 'player2',
          name: msg.name
        }));
      }

      ws.send(JSON.stringify({
        type: 'joined',
        role: 'player2',
        code: msg.code,
        opponent: room.player1.name
      }));

      return;
    }

    if (msg.role === 'spectator') {
      room.spectators.add({ ws, playerId: ws.playerId, name: msg.name });

      ws.send(JSON.stringify({
        type: 'joined',
        role: 'spectator',
        code: msg.code,
        player1Name: room.player1?.name || 'Игрок 1',
        player2Name: room.player2?.name || 'Игрок 2'
      }));

      return;
    }

    ws.send(JSON.stringify({ type: 'error', message: 'Invalid role or slot taken' }));
  } catch (error) {
    console.error('Join room error:', error);
    ws.send(JSON.stringify({ type: 'error', message: error.message }));
  }
}
