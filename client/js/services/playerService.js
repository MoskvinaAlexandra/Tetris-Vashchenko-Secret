class PlayerService {
  static async getProfile(playerId) {
    const response = await fetch(`/api/player/${playerId}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  }

  static async getStats(playerId) {
    const response = await fetch(`/api/player/${playerId}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return await response.json();
  }

  static async getMatches(playerId, limit = 20) {
    const response = await fetch(`/api/player/${playerId}/matches?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch matches');
    return await response.json();
  }

  static async getMyProfile() {
    const response = await fetch('/api/player/me/profile', {
      headers: authService.getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  }
}

window.PlayerService = PlayerService;
