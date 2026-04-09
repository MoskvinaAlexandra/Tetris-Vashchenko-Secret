import pool from '../db.js';

export const saveScore = async (req, res) => {
  try {
    const { name, score } = req.body;
    await pool.query(
      'INSERT INTO scores (name, score, created_at) VALUES ($1, $2, NOW())',
      [name, score]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save score error:', err);
    res.status(500).json({ error: 'DB error' });
  }
};

export const getTop10 = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT name, score, created_at FROM scores ORDER BY score DESC, created_at DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Top10 error:', err);
    res.json([]);
  }
};

