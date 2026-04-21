import express from 'express';
import { MatchService } from '../services/MatchService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'best_score';
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);

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
    res.status(500).json({ error: err.message });
  }
});

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
    res.status(500).json({ error: err.message });
  }
});

export default router;

