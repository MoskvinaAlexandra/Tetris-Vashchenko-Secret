export class MatchRenderer {
  constructor(matchManager) {
    this.matchManager = matchManager;
  }

  renderBoard(role, state) {
    const renderer = this.matchManager.renderers[role];
    if (renderer) {
      renderer.render(state);
    }
  }

  renderRemoteState(state, role, isSpectator) {
    if (!state || !role) return;
    this.renderBoard(role, state);
    if (isSpectator) {
      this.matchManager.statsUpdater.updateSpectatorStats(role, state);
    } else {
      this.matchManager.statsUpdater.updateStatsForRole(role, state);
    }
  }
}
