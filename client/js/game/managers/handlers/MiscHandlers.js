import { t } from '../../../i18n.js';

export class MiscHandlers {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  handlePlayerJoined(message) {
    this.gameManager.setStatus(t('playerJoined', message.name));
  }

  handleReaction(message) {
    const { reactionManager, lobbyManager } = this.gameManager;
    const senderRole = message.senderRole || reactionManager.resolveReactionRole(message.from, lobbyManager.playerNames);
    const targetRole = (message.targetRole === 'player1' || message.targetRole === 'player2')
      ? message.targetRole
      : null;
    reactionManager.showReaction(senderRole, message.reaction || '👏', targetRole);
  }

  handleError(message) {
    this.gameManager.setStatus(t('websocketError', message.message), '#6a3748');
  }

  handleClose() {
    const { lobbyManager, setStatus } = this.gameManager;
    if (lobbyManager.roomCode) {
      setStatus(t('connectionLost'), '#6a3748');
    }
  }
}
