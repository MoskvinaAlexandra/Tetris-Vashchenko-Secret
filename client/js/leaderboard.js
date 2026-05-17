class LeaderboardManager {
  constructor() {
    this.currentSort = 'best_score';
    this.init();
  }
  init() {
    if (window.updateAuthUI) {
      window.updateAuthUI();
    }
    this.setupEventListeners();
    this.loadLeaderboard();
  }
  setupEventListeners() {
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
      sortBy.addEventListener('change', (event) => {
        this.currentSort = event.target.value;
        this.loadLeaderboard();
      });
    }
  }
  async loadLeaderboard() {
    if (window.showLoader) window.showLoader();
    try {
      const response = await fetch(`/api/leaderboard?sortBy=${this.currentSort}&limit=100`);
      if (!response.ok) {
        throw new Error('Не удалось получить таблицу лидеров');
      }
      const data = await response.json();
      this.renderLeaderboard(data.data);
      const errorBox = document.getElementById('errorMessage');
      if (errorBox) errorBox.style.display = 'none';
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      const errorBox = document.getElementById('errorMessage');
      if (errorBox) {
        errorBox.textContent = `Ошибка загрузки: ${error.message}`;
        errorBox.style.display = 'block';
      }
    } finally {
      if (window.hideLoader) window.hideLoader();
    }
  }
  renderLeaderboard(entries) {
    const tbody = document.getElementById('leaderboardBody');
    if (!entries || entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Пока нет завершённых матчей.</td></tr>';
      return;
    }
    tbody.innerHTML = entries.map((entry) => `
      <tr>
        <td class="leaderboard-rank">${entry.rank}</td>
        <td class="leaderboard-name">${entry.name}</td>
        <td>${entry.best_score}</td>
        <td>${entry.wins}</td>
        <td>${entry.losses}</td>
        <td>${entry.games_played}</td>
        <td>${entry.total_lines_cleared}</td>
      </tr>
    `).join('');
  }
}
document.addEventListener('DOMContentLoaded', () => {
  new LeaderboardManager();
});