class LeaderboardManager {
  constructor() {
    this.currentSort = 'best_score';
    this.init();
  }

  init() {
    this.updateAuthUI();
    this.setupEventListeners();
    this.loadLeaderboard();
  }

  updateAuthUI() {
    const profileLink = document.getElementById('profileLink');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');

    if (authService.isLoggedIn()) {
      profileLink.style.display = 'inline-flex';
      logoutBtn.style.display = 'inline-flex';
      loginBtn.style.display = 'none';

      logoutBtn.addEventListener('click', () => {
        authService.logout();
        window.location.href = '/';
      });
    } else {
      profileLink.style.display = 'none';
      logoutBtn.style.display = 'none';
      loginBtn.style.display = 'inline-flex';
    }
  }

  setupEventListeners() {
    document.getElementById('sortBy').addEventListener('change', (event) => {
      this.currentSort = event.target.value;
      this.loadLeaderboard();
    });
  }

  async loadLeaderboard() {
    try {
      const response = await fetch(`/api/leaderboard?sortBy=${this.currentSort}&limit=100`);
      if (!response.ok) {
        throw new Error('Не удалось получить таблицу лидеров');
      }

      const data = await response.json();
      this.renderLeaderboard(data.data);
      document.getElementById('errorMessage').style.display = 'none';
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      const errorBox = document.getElementById('errorMessage');
      errorBox.textContent = `Ошибка загрузки: ${error.message}`;
      errorBox.style.display = 'block';
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
