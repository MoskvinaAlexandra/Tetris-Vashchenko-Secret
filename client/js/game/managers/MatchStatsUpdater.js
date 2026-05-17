export class MatchStatsUpdater {
  updateStatsForRole(role, state) {
    const scoreEl = document.getElementById(`${role}Score`);
    const linesEl = document.getElementById(`${role}Lines`);
    if (scoreEl) scoreEl.textContent = state.score ?? 0;
    if (linesEl) linesEl.textContent = state.lines ?? 0;
  }

  updateSpectatorStats(role, state) {
    const suffix = role === 'player1' ? '1' : '2';
    const scoreEl = document.getElementById(`spectatorScore${suffix}`);
    const linesEl = document.getElementById(`spectatorLines${suffix}`);
    if (scoreEl) scoreEl.textContent = state.score ?? 0;
    if (linesEl) linesEl.textContent = state.lines ?? 0;
  }
}
