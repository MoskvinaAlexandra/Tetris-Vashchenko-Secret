import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return process.env.JWT_SECRET;
}

export function generateToken(playerId, name) {
  return jwt.sign(
    { playerId, name },
    getJwtSecret(),
    { expiresIn: '2d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.debug('Token expired');
    } else if (err.name === 'JsonWebTokenError') {
      logger.debug('Invalid token:', err.message);
    } else {
      logger.error('Token verification error:', err);
    }
    return null;
  }
}
export function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.player = decoded;
  next();
}
export function authenticateWS(message) {
  const token = message.token;
  if (!token) {
    return null;
  }
  return verifyToken(token);
}