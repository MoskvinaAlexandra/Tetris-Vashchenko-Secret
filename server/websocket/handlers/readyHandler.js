import { MatchService } from '../../services/MatchService.js';

function createSeed() {
  return Math.floor(Math.random() * 2_147_483_647);
}

export async function handleReady(ws, msg, roomManager) {
  const room = roomManager.getRoom(msg.code);
  if (!room || !room.player1 || !room.player2) {
    return;
  }

  if (ws.role !== 'player1' && ws.role !== 'player2') {
    return;
  }

  if (!room[ws.role]?.connected || room.matchStarted) {
    return;
  }

  room.matchCompleted = false;
  room.rematchVotes.clear();
  room[ws.role].ready = Boolean(msg.ready);
  roomManager.broadcastRoomState(msg.code);

  const bothConnected = room.player1.connected && room.player2.connected;
  const bothReady = room.player1.ready && room.player2.ready;
  if (!bothConnected || !bothReady) {
    if (room.countdownTimer) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
    }
    return;
  }

  if (room.countdownTimer) {
    return;
  }

  try {
    room.matchStarted = true;
    room.gameLive = false;
    room.seed = createSeed();

    let count = 3;
    room.countdownTimer = setInterval(async () => {
      try {
        const freshRoom = roomManager.getRoom(msg.code);
        if (!freshRoom || !freshRoom.player1 || !freshRoom.player2) {
          clearInterval(room.countdownTimer);
          room.countdownTimer = null;
          return;
        }

        const stillReady = freshRoom.player1.ready && freshRoom.player2.ready;
        const stillConnected = freshRoom.player1.connected && freshRoom.player2.connected;
        if (!stillReady || !stillConnected) {
          clearInterval(freshRoom.countdownTimer);
          freshRoom.countdownTimer = null;
          freshRoom.matchStarted = false;
          freshRoom.gameLive = false;
          freshRoom.match = null;
          return;
        }

        roomManager.broadcastToRoom(msg.code, { type: 'countdown', count });
        count -= 1;

        if (count < 0) {
          clearInterval(freshRoom.countdownTimer);
          freshRoom.countdownTimer = null;
          freshRoom.gameLive = true;
          if (!freshRoom.match) {
            freshRoom.match = await MatchService.createMatch(msg.code, freshRoom.player1.playerId, freshRoom.player2.playerId);
          }

          roomManager.broadcastToRoom(msg.code, {
            type: 'startGame',
            code: msg.code,
            player1Name: freshRoom.player1.name,
            player2Name: freshRoom.player2.name,
            seed: freshRoom.seed
          });
        }
      } catch (error) {
        console.error('Countdown/start error:', error);
      }
    }, 1000);
  } catch (error) {
    room.matchStarted = false;
    room.gameLive = false;
    room.matchCompleted = false;
    if (room.countdownTimer) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
    }
    console.error('Match creation error:', error);
  }
}
