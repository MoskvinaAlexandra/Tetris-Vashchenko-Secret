// server/routes/player.js — Player profile and stats routes
import express from 'express';
import { PlayerService } from '../services/PlayerService.js';
import { MatchService } from '../services/MatchService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/player/:playerId
 * Get player profile
 */
router.get('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const player = await PlayerService.getById(playerId);
    res.json(player);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * GET /api/player/:playerId/stats
 * Get player statistics
 */
router.get('/:playerId/stats', async (req, res) => {
  try {
    const { playerId } = req.params;
    const stats = await PlayerService.getStats(playerId);
    res.json(stats);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * GET /api/player/:playerId/matches
 * Get player match history
 */
router.get('/:playerId/matches', async (req, res) => {
  try {
    const { playerId } = req.params;
    const limit = req.query.limit || 20;
    const matches = await MatchService.getPlayerMatches(playerId, limit);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/player/me/profile
 * Get current player profile (requires auth)
 */
router.get('/me/profile', authMiddleware, async (req, res) => {
  try {
    const player = await PlayerService.getById(req.player.playerId);
    const stats = await PlayerService.getStats(req.player.playerId);
    res.json({ ...player, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

