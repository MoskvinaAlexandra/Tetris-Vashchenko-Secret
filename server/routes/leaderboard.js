import express from 'express';
import { MatchService } from '../services/MatchService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/top10', async (req, res) => {
  try {
    const leaderboard = await MatchService.getLeaderboard('best_score', 10);
    res.json(
      leaderboard.map((entry, index) => ({
        rank: index + 1,
        player_id: entry.player_id,
        name: entry.name,
        best_score: entry.best_score,
        wins: entry.wins,
        created_at: entry.created_at
      }))
    );
  } catch (err) {
    logger.error('Failed to get top10 leaderboard:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'best_score';
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Math.max(1, Math.min(isNaN(parsedLimit) ? 100 : parsedLimit, 1000));
    
    const leaderboard = await MatchService.getLeaderboard(sortBy, limit);
    res.json({
      success: true,
      sortBy,
      count: leaderboard.length,
      data: leaderboard.map((entry, index) => ({
        rank: index + 1,
        player_id: entry.player_id,
        name: entry.name,
        best_score: entry.best_score,
        wins: entry.wins,
        losses: entry.losses,
        games_played: entry.games_played,
        total_lines_cleared: entry.total_lines_cleared,
        avg_score: entry.avg_score,
        updated_at: entry.updated_at
      }))
    });
  } catch (err) {
    logger.error('Failed to get leaderboard:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;