import { MatchService } from '../../services/MatchService.js';
import { logger } from '../../utils/logger.js';

function createSeed() {
  return Math.floor(Math.random() * 2_147_483_647);
}

function validateReadyRequest(ws, room) {
  if (!room || !room.player1 || !room.player2) {
    return false;
  }
  if (ws.role !== 'player1' && ws.role !== 'player2') {
    return false;
  }
  if (!room[ws.role]?.connected || room.matchStarted) {
    return false;
  }
  return true;
}

function updatePlayerReadyState(room, ws, msg, roomManager) {
  room.matchCompleted = false;
  room.rematchVotes.clear();
  room[ws.role].ready = Boolean(msg.ready);
  roomManager.broadcastRoomState(msg.code);
}

function checkBothPlayersReady(room) {
  const bothConnected = room.player1.connected && room.player2.connected;
  const bothReady = room.player1.ready && room.player2.ready;
  return bothConnected && bothReady;
}

function clearCountdownTimer(room) {
  if (room.countdownTimer) {
    clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
  }
}

function validateRoomState(freshRoom) {
  if (!freshRoom || !freshRoom.player1 || !freshRoom.player2) {
    return false;
  }
  const stillReady = freshRoom.player1.ready && freshRoom.player2.ready;
  const stillConnected = freshRoom.player1.connected && freshRoom.player2.connected;
  return stillReady && stillConnected;
}

function resetMatchState(room) {
  room.matchStarted = false;
  room.gameLive = false;
  room.match = null;
}

async function startMatch(freshRoom, code, roomManager) {
  freshRoom.countdownTimer = null;
  freshRoom.gameLive = true;
  
  if (!freshRoom.match) {
    freshRoom.match = await MatchService.createMatch(
      code,
      freshRoom.player1.playerId,
      freshRoom.player2.playerId
    );
  }
  
  roomManager.broadcastToRoom(code, {
    type: 'startGame',
    code: code,
    player1Name: freshRoom.player1.name,
    player2Name: freshRoom.player2.name,
    seed: freshRoom.seed
  });
}

function createCountdownFunction(room, code, roomManager) {
  let count = 3;
  
  const runCountdown = async () => {
    try {
      const freshRoom = roomManager.getRoom(code);
      
      if (!validateRoomState(freshRoom)) {
        clearCountdownTimer(freshRoom || room);
        if (freshRoom) {
          resetMatchState(freshRoom);
        }
        return;
      }
      
      roomManager.broadcastToRoom(code, { type: 'countdown', count });
      count -= 1;
      
      if (count < 0) {
        await startMatch(freshRoom, code, roomManager);
      } else {
        room.countdownTimer = setTimeout(runCountdown, 1000);
      }
    } catch (error) {
      logger.error('Countdown/start error:', error);
      clearCountdownTimer(room);
    }
  };
  
  return runCountdown;
}

export async function handleReady(ws, msg, roomManager) {
  const room = roomManager.getRoom(msg.code);
  
  if (!validateReadyRequest(ws, room)) {
    return;
  }
  
  updatePlayerReadyState(room, ws, msg, roomManager);
  
  if (!checkBothPlayersReady(room)) {
    clearCountdownTimer(room);
    return;
  }
  
  if (room.countdownTimer) {
    return;
  }
  
  try {
    room.matchStarted = true;
    room.gameLive = false;
    room.seed = createSeed();
    
    const runCountdown = createCountdownFunction(room, msg.code, roomManager);
    room.countdownTimer = setTimeout(runCountdown, 1000);
  } catch (error) {
    resetMatchState(room);
    room.matchCompleted = false;
    clearCountdownTimer(room);
    logger.error('Match creation error:', error);
  }
}
