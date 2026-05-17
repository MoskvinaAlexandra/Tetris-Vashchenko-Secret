if (!authService.isLoggedIn()) {
  window.location.href = '/login.html';
}
async function loadProfile() {
  if (window.showLoader) window.showLoader();
  try {
    const profile = await PlayerService.getMyProfile();
    const playerId = authService.getCurrentPlayerId();
    document.getElementById('playerName').textContent = profile.name;
    document.getElementById('playerEmail').textContent = profile.email;
    document.getElementById('joinDate').textContent = `Присоединился: ${formatDate(profile.created_at)}`;
    const stats = profile.stats;
    document.getElementById('bestScore').textContent = stats.best_score;
    document.getElementById('wins').textContent = stats.wins;
    document.getElementById('losses').textContent = stats.losses;
    document.getElementById('gamesPlayed').textContent = stats.games_played;
    document.getElementById('totalLines').textContent = stats.total_lines_cleared;
    document.getElementById('avgScore').textContent = stats.avg_score;
    document.getElementById('bestLines').textContent = stats.best_lines;
    document.getElementById('totalScore').textContent = stats.total_score;
    await loadMatches(playerId);
  } catch (err) {
    console.error('Failed to load profile:', err);
    const statusEl = document.getElementById('statusMessage');
    if (statusEl) {
      statusEl.textContent = 'Ошибка загрузки профиля';
      statusEl.style.color = '#6a3748';
    }
  } finally {
    if (window.hideLoader) window.hideLoader();
  }
}
async function loadMatches(playerId) {
  try {
    const matches = await PlayerService.getMatches(playerId, 20);
    const matchesList = document.getElementById('matchesList');
    if (matches.length === 0) {
      matchesList.innerHTML = '<p>У вас еще нет матчей</p>';
      return;
    }
    matchesList.innerHTML = matches
      .map(match => {
        const isWinner = match.winner_id === playerId;
        const opponent = match.player1_id === playerId ? match.player2_name : match.player1_name;
        const yourScore = match.player1_id === playerId ? match.player1_score : match.player2_score;
        const opponentScore = match.player1_id === playerId ? match.player2_score : match.player1_score;
        return `
          <div class="match-card ${isWinner ? 'win' : 'loss'}">
            <div class="match-header">
              <span class="match-result">${isWinner ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</span>
              <span class="match-date">${formatDateTime(match.played_at)}</span>
            </div>
            <div class="match-details">
              <div class="match-opponent">
                <span class="vs-text">против</span>
                <span class="opponent-name">${opponent}</span>
              </div>
              <div class="match-score">
                <div class="your-score">
                  <span class="label">Ваш счет</span>
                  <span class="score">${yourScore}</span>
                </div>
                <div class="separator">:</div>
                <div class="opponent-score">
                  <span class="label">Счет противника</span>
                  <span class="score">${opponentScore}</span>
                </div>
              </div>
              <div class="match-duration">
                ⏱️ ${match.duration_seconds}сек
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Failed to load matches:', err);
    document.getElementById('matchesList').innerHTML = '<p>Ошибка загрузки истории</p>';
  }
}
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите выйти?')) {
      authService.logout();
      window.location.href = '/login.html';
    }
  });
}

loadProfile();