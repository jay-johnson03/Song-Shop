const express = require('express');
const router = express.Router();
const { query } = require('../db/query');

// Merge duplicate artists
router.post('/merge-duplicate-artists', async (req, res) => {
  try {
    const { adminSpotifyId } = req.body || {};
    const configuredAdmin = process.env.ADMIN_SPOTIFY_ID;
    if (configuredAdmin && adminSpotifyId !== configuredAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const duplicates = await query(`
      SELECT artistName, MIN(artistId) AS keepId,
             GROUP_CONCAT(artistId ORDER BY artistId) AS artistIds,
             COUNT(*) AS cnt
      FROM artist
      GROUP BY artistName
      HAVING cnt > 1
    `);

    let artistsRemoved = 0;
    let songsRepointed = 0;

    for (const row of duplicates) {
      const keepId = Number(row.keepId);
      const allIds = (row.artistIds || '').split(',').map(id => Number(id)).filter(Boolean);
      const removeIds = allIds.filter(id => id !== keepId);

      if (removeIds.length === 0) continue;

      const placeholders = removeIds.map(() => '?').join(',');

      // Repoint songs to the canonical artist
      const updateParams = [keepId, ...removeIds];
      const updateResult = await query(`UPDATE song SET artistId = ? WHERE artistId IN (${placeholders})`, updateParams);
      songsRepointed += updateResult.affectedRows || 0;

      // Remove duplicate artist rows
      await query(`DELETE FROM artist WHERE artistId IN (${placeholders})`, removeIds);
      artistsRemoved += removeIds.length;
    }

    res.json({
      success: true,
      message: duplicates.length === 0 ? 'No duplicate artists found' : 'Duplicate artists merged',
      groupsProcessed: duplicates.length,
      artistsRemoved,
      songsRepointed
    });
  } catch (err) {
    console.error('Error merging duplicate artists:', err);
    res.status(500).json({ error: 'Failed to merge duplicate artists' });
  }
});

// Restrict/unrestrict a user
router.put('/users/:userId/restrict', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminSpotifyId, isRestricted } = req.body;

    if (adminSpotifyId !== process.env.ADMIN_SPOTIFY_ID) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await query('UPDATE usertable SET isRestricted = ? WHERE userId = ?', [isRestricted ? 1 : 0, userId]);
    res.json({ success: true, message: `User ${isRestricted ? 'restricted' : 'unrestricted'} successfully` });
  } catch (err) {
    console.error('Error restricting user:', err);
    res.status(500).json({ error: 'Failed to update user restriction' });
  }
});

// Get all messages (including restricted users)
router.get('/messages', async (req, res) => {
  try {
    const messages = await query(`
      SELECT m.messageId, m.messageText, m.createdAt, m.updatedAt, u.userId, u.userName, u.spotifyId, u.isRestricted
      FROM messages m
      JOIN usertable u ON m.userId = u.userId
      ORDER BY m.createdAt DESC
    `);
    res.json({ messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
