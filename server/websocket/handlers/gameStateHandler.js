import { WebSocket } from 'ws';

export async function handleGameState(ws, msg, roomManager) {
  const room = roomManager.getRoom(msg.code);
  if (!room || !msg.state) return;

  if (ws.role === 'player1' || ws.role === 'player2') {
    const slot = room[ws.role];
    if (slot) {
      slot.lastState = {
        score: Number(msg.state.score) || 0,
        lines: Number(msg.state.lines) || 0
      };
    }
  }

  const stateMsg = {
    type: 'gameState',
    state: msg.state,
    senderRole: ws.role
  };

  roomManager.getRoomClients(room).forEach((client) => {
    if (client !== ws && client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(stateMsg));
    }
  });
}
