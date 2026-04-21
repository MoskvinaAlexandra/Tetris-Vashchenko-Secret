class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.player = JSON.parse(localStorage.getItem('player') || 'null');
  }

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

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  setPlayer(player) {
    this.player = player;
    localStorage.setItem('player', JSON.stringify(player));
  }

  logout() {
    this.token = null;
    this.player = null;
    localStorage.removeItem('token');
    localStorage.removeItem('player');
  }

  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  isLoggedIn() {
    return !!this.token && !!this.player;
  }

  getCurrentPlayer() {
    return this.player;
  }

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

const authService = new AuthService();
window.authService = authService;

