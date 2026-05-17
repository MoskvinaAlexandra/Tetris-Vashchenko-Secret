import { t } from '../../i18n.js';

export class MatchOverlayManager {
  showMatchOverlay() {
    const overlay = document.getElementById('matchOverlay');
    if (overlay) overlay.classList.add('is-visible');
  }

  hideMatchOverlay() {
    const overlay = document.getElementById('matchOverlay');
    if (overlay) overlay.classList.remove('is-visible');
  }

  renderMatchOverlay(message, role) {
    const resultCard = document.getElementById('matchResultCard');
    const title = document.getElementById('matchResultTitle');
    const text = document.getElementById('matchResultText');
    const hint = document.getElementById('matchResultHint');
    const rematchBtn = document.getElementById('rematchBtn');
    const scoreLeftEl = document.getElementById('matchScoreLeft');
    const scoreRightEl = document.getElementById('matchScoreRight');

    if (scoreLeftEl) scoreLeftEl.textContent = message.player1Score ?? 0;
    if (scoreRightEl) scoreRightEl.textContent = message.player2Score ?? 0;

    if (resultCard) {
      resultCard.classList.remove('win', 'loss', 'draw');
    }

    if (role === 'spectator') {
      this.renderSpectatorOverlay(title, text, hint, rematchBtn, resultCard, message);
    } else {
      this.renderPlayerOverlay(title, text, hint, rematchBtn, resultCard, message, role);
    }

    this.showMatchOverlay();
  }

  renderSpectatorOverlay(title, text, hint, rematchBtn, resultCard, message) {
    if (title) title.textContent = t('roundComplete');
    if (text) text.textContent = `Победил ${message.winnerName || message.winner}.`;
    if (hint) hint.textContent = t('waitingForRematchDecision');
    if (rematchBtn) {
      rematchBtn.disabled = true;
      rematchBtn.textContent = t('waitingForPlayers');
    }
    if (resultCard) resultCard.classList.add('draw');
  }

  renderPlayerOverlay(title, text, hint, rematchBtn, resultCard, message, role) {
    const didWin = message.winner === role;
    if (title) title.textContent = didWin ? t('youWon') : t('youLost');
    if (text) text.textContent = didWin ? t('roundWon') : t('roundLost', message.winnerName);
    if (hint) hint.textContent = t('rematchHint');
    if (rematchBtn) {
      rematchBtn.disabled = false;
      rematchBtn.textContent = t('rematch');
    }
    if (resultCard) resultCard.classList.add(didWin ? 'win' : 'loss');
  }

  updateRematchStatus() {
    this.showMatchOverlay();
    const hint = document.getElementById('matchResultHint');
    if (hint) hint.textContent = t('waitingForRematch');
  }
}
