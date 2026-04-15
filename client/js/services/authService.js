// client/js/services/authService.js — Frontend authentication service
class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.player = JSON.parse(localStorage.getItem('player') || 'null');
  }

  /**
   * Register new player
   */
  async register(name, email, password) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    this.setToken(data.token);
    this.setPlayer(data.player);
    return data;
  }

  /**
   * Login player
   */
  async login(nameOrEmail, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nameOrEmail, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    this.setToken(data.token);
    this.setPlayer(data.player);
    return data;
  }

  /**
   * Verify token
   */
  async verify() {
    if (!this.token) {
      return false;
    }

    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * Set token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  /**
   * Set player data
   */
  setPlayer(player) {
    this.player = player;
    localStorage.setItem('player', JSON.stringify(player));
  }

  /**
   * Logout
   */
  logout() {
    this.token = null;
    this.player = null;
    localStorage.removeItem('token');
    localStorage.removeItem('player');
  }

  /**
   * Get authorization header
   */
  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  /**
   * Check if logged in
   */
  isLoggedIn() {
    return !!this.token && !!this.player;
  }

  /**
   * Get current player
   */
  getCurrentPlayer() {
    return this.player;
  }

  /**
   * Get current player ID
   */
  getCurrentPlayerId() {
    return this.player?.player_id;
  }

  getToken() {
    return this.token;
  }

  getPlayerName() {
    return this.player?.name || '';
  }
}

// Global instance
const authService = new AuthService();
window.authService = authService;

