import express from 'express';
import { PlayerService } from '../services/PlayerService.js';
import { MatchService } from '../services/MatchService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/me/profile', authMiddleware, async (req, res) => {
  try {
    const player = await PlayerService.getById(req.player.playerId);
    const stats = await PlayerService.getStats(req.player.playerId);
    res.json({ ...player, stats });
  } catch (err) {
    logger.error('Failed to get player profile:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    if (isNaN(playerId) || playerId <= 0) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }
    const player = await PlayerService.getById(playerId);
    res.json(player);
  } catch (err) {
    logger.error('Failed to get player by ID:', err);
    res.status(404).json({ error: err.message });
  }
});

router.get('/:playerId/stats', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    if (isNaN(playerId) || playerId <= 0) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }
    const stats = await PlayerService.getStats(playerId);
    res.json(stats);
  } catch (err) {
    logger.error('Failed to get player stats:', err);
    res.status(404).json({ error: err.message });
  }
});

router.get('/:playerId/matches', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    if (isNaN(playerId) || playerId <= 0) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }
    const limit = parseInt(req.query.limit, 10) || 20;
    const matches = await MatchService.getPlayerMatches(playerId, limit);
    res.json(matches);
  } catch (err) {
    logger.error('Failed to get player matches:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;