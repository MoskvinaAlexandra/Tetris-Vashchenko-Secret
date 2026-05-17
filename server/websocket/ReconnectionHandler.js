const RECONNECT_TIMEOUT_MS = 30_000;

export class ReconnectionHandler {
  constructor() {
    this.reconnectTimers = new Map();
  }

  clearTimer(code, role) {
    const key = `${code}:${role}`;
    const timer = this.reconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(key);
    }
  }

  scheduleTimeout(code, role, onTimeout) {
    this.clearTimer(code, role);
    const key = `${code}:${role}`;
    const timer = setTimeout(() => {
      onTimeout();
      this.reconnectTimers.delete(key);
    }, RECONNECT_TIMEOUT_MS);
    this.reconnectTimers.set(key, timer);
  }

  clearAll() {
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
  }
}
