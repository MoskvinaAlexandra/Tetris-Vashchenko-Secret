// server/middleware/authMiddleware.js — JWT authentication
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

/**
 * Generate JWT token
 * @param {number} playerId
 * @param {string} name
 * @returns {string}
 */
export function generateToken(playerId, name) {
  return jwt.sign(
    { playerId, name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 * @param {string} token
 * @returns {object|null}
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Express middleware for protecting routes
 */
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

/**
 * WebSocket authentication helper
 */
export function authenticateWS(message) {
  const token = message.token;
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

