const express = require('express');
const router = express.Router();
const { query } = require('../db/query');

// Save user favorite
router.post('/', async (req, res) => {
  try {
    const { spotifyId, songId } = req.body;
    if (!spotifyId || !songId) return res.status(400).json({ error: 'Missing spotifyId or songId' });

    const rows = await query('SELECT userId FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await query('INSERT IGNORE INTO userfavorites (userId, songId) VALUES (?, ?)', [rows[0].userId, songId]);
    res.json({ success: true, message: 'Favorite saved' });
  } catch (err) {
    console.error('Error saving favorite:', err);
    res.status(500).json({ error: 'Failed to save favorite' });
  }
});

// Get user favorites
router.get('/:spotifyId', async (req, res) => {
  try {
    const favorites = await query(`
      SELECT s.songId, s.songTitle, a.artistName, g.genreName, s.imageUrl
      FROM userfavorites uf
      JOIN usertable u ON uf.userId = u.userId
      JOIN song s ON uf.songId = s.songId
      JOIN artist a ON s.artistId = a.artistId
      JOIN genre g ON s.genreId = g.genreId
      WHERE u.spotifyId = ?
      ORDER BY uf.favoritedAt DESC
    `, [req.params.spotifyId]);
    res.json({ favorites });
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Delete user favorite
router.delete('/:spotifyId/:songId', async (req, res) => {
  try {
    const rows = await query('SELECT userId FROM usertable WHERE spotifyId = ?', [req.params.spotifyId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await query('DELETE FROM userfavorites WHERE userId = ? AND songId = ?', [rows[0].userId, req.params.songId]);
    res.json({ success: true, message: 'Favorite removed' });
  } catch (err) {
    console.error('Error deleting favorite:', err);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

module.exports = router;
