const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};
const currentLevel = window.location.hostname === 'localhost' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
export const logger = {
  debug: (...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
  info: (...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },
  warn: (...args) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },
  error: (...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  }
};