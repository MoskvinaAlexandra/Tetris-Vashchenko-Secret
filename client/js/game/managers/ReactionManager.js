export class ReactionManager {
  constructor() {
    this.reactionTimers = {
      player1Center: null,
      player2Center: null,
      player1Edge: null,
      player2Edge: null
    };
    this.spectatorReactionTarget = 'player1';
  }
  sendReaction(wsClient, emoji) {
    if (!wsClient) return;
    wsClient.sendReaction(emoji, this.spectatorReactionTarget);
  }
  toggleSpectatorTarget() {
    this.spectatorReactionTarget = this.spectatorReactionTarget === 'player1' ? 'player2' : 'player1';
    this.updateSpectatorTargetUI();
  }
  updateSpectatorTargetUI() {
    const player1Btn = document.getElementById('spectatorTargetPlayer1');
    const player2Btn = document.getElementById('spectatorTargetPlayer2');
    if (!player1Btn || !player2Btn) return;
    player1Btn.classList.toggle('active-target', this.spectatorReactionTarget === 'player1');
    player2Btn.classList.toggle('active-target', this.spectatorReactionTarget === 'player2');
  }
  resolveReactionRole(fromName, playerNames) {
    if (!fromName) return null;
    if (fromName === playerNames.player1) return 'player1';
    if (fromName === playerNames.player2) return 'player2';
    return null;
  }
  showReaction(senderRole, emoji, targetRole = null) {
    const normalizedEmoji = String(emoji || '').trim() || '👏';
    let targets = [];
    let timerKey = null;
    if (senderRole === 'player1') {
      targets = ['reactionPlayer1Center', 'reactionPlayer1CenterSpectator'];
      timerKey = 'player1Center';
    } else if (senderRole === 'player2') {
      targets = ['reactionPlayer2Center', 'reactionPlayer2CenterSpectator'];
      timerKey = 'player2Center';
    } else if (senderRole === 'spectator') {
      if (targetRole !== 'player1' && targetRole !== 'player2') {
        return;
      }
      if (targetRole === 'player1') {
        targets = ['reactionPlayer1Edge', 'reactionPlayer1EdgeSpectator'];
        timerKey = 'player1Edge';
      } else {
        targets = ['reactionPlayer2Edge', 'reactionPlayer2EdgeSpectator'];
        timerKey = 'player2Edge';
      }
    }
    if (!targets.length || !timerKey) return;
    targets.forEach((id) => {
      const target = document.getElementById(id);
      if (!target) return;
      target.textContent = normalizedEmoji;
      target.classList.add('visible');
    });
    if (this.reactionTimers[timerKey]) {
      clearTimeout(this.reactionTimers[timerKey]);
    }
    this.reactionTimers[timerKey] = setTimeout(() => {
      targets.forEach((id) => {
        const target = document.getElementById(id);
        if (!target) return;
        target.classList.remove('visible');
        target.textContent = '';
      });
      this.reactionTimers[timerKey] = null;
    }, 1400);
  }
  cleanup() {
    Object.values(this.reactionTimers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    this.reactionTimers = {
      player1Center: null,
      player2Center: null,
      player1Edge: null,
      player2Edge: null
    };
  }
}