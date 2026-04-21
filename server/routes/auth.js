import express from 'express';
import { PlayerService } from '../services/PlayerService.js';
import { generateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }

    const player = await PlayerService.register(name, email, password);
    const token = generateToken(player.player_id, player.name);

    res.status(201).json({
      success: true,
      player: {
        player_id: player.player_id,
        name: player.name,
        email: player.email
      },
      token
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { nameOrEmail, password } = req.body;

    if (!nameOrEmail || !password) {
      return res.status(400).json({ error: 'Name/email and password required' });
    }

    const player = await PlayerService.authenticate(nameOrEmail, password);
    const token = generateToken(player.player_id, player.name);

    res.json({
      success: true,
      player: {
        player_id: player.player_id,
        name: player.name,
        email: player.email
      },
      token
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/verify', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    const decoded = require('jsonwebtoken').verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
    );
    res.json({ valid: true, player: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

export default router;

