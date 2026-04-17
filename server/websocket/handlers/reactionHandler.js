import { WebSocket } from 'ws';

export async function handleReaction(ws, msg, roomManager) {
  const room = roomManager.getRoom(msg.code);
  if (!room) return;

  const payload = {
    type: 'reaction',
    reaction: msg.reaction,
    from: msg.name,
    senderRole: ws.role
  };

  roomManager.getRoomClients(room).forEach((client) => {
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}
