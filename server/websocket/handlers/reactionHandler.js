// server/websocket/handlers/reactionHandler.js
import { WebSocket } from 'ws';

export async function handleReaction(ws, msg, rooms) {
  const room = rooms.get(msg.code);
  if (!room) return;

  [room.player1.ws, room.player2.ws, ...Array.from(room.spectators).map(s => s.ws)].forEach(client => {
    if (client !== ws && client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'reaction',
        reaction: msg.reaction,
        from: msg.name
      }));
    }
  });
}

