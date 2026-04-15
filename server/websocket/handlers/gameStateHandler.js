// server/websocket/handlers/gameStateHandler.js
import { WebSocket } from 'ws';

export async function handleGameState(ws, msg, rooms) {
  const room = rooms.get(msg.code);
  if (!room) return;

  const stateMsg = {
    type: 'gameState',
    state: msg.state,
    senderRole: ws.role
  };

  [room.player1.ws, room.player2.ws, ...Array.from(room.spectators).map(s => s.ws)].forEach(client => {
    if (client !== ws && client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(stateMsg));
    }
  });
}

