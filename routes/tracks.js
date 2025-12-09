const express = require('express');
const router = express.Router();
const { query } = require('../db/query');
const { addTrack } = require('../db/add-track');

// Save track to database
router.post('/save-track', async (req, res) => {
  try {
    const { spotifyId, title, artistName, genre, albumImage, spotifyUrl } = req.body;
    
    if (!spotifyId || !title || !artistName || !genre) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await addTrack({
      songTitle: title,
      artistName: artistName,
      genreName: genre,
      spotifyId: spotifyId,
      imageUrl: albumImage || null,
      previewUrl: spotifyUrl || null
    });

    res.json({ 
      success: true, 
      message: 'Track saved to database'
    });
  } catch (error) {
    console.error('Error saving track:', error);
    res.status(500).json({ error: 'Failed to save track to database' });
  }
});

// Get all tracks with pagination
router.get('/tracks', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const countRows = await query('SELECT COUNT(*) AS totalSongs FROM song');
    const totalSongs = countRows[0].totalSongs;

    const tracks = await query(`
      SELECT s.songId, s.songTitle, s.artistId, a.artistName, g.genreName,
             s.spotifySongId, s.imageUrl
      FROM song s
      JOIN artist a ON s.artistId = a.artistId
      JOIN genre g ON s.genreId = g.genreId
      ORDER BY s.songId DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({ totalSongs, limit, offset, tracks });
  } catch (err) {
    console.error('Error fetching tracks:', err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        (SELECT COUNT(*) FROM song)   AS songs,
        (SELECT COUNT(*) FROM artist) AS artists,
        (SELECT COUNT(*) FROM genre)  AS genres
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('Stats query failed:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get tracks by genre
router.get('/tracks/genre/:genre', async (req, res) => {
  try {
    const tracks = await query(`
      SELECT s.songId, s.songTitle, a.artistName, g.genreName
      FROM song s
      JOIN artist a ON s.artistId = a.artistId
      JOIN genre g ON s.genreId = g.genreId
      WHERE g.genreName = ?
      ORDER BY s.songId DESC
    `, [req.params.genre]);
    res.json({ tracks });
  } catch (err) {
    console.error('Error fetching tracks by genre:', err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Get song ID by Spotify track ID
router.get('/songs/spotify/:spotifyTrackId', async (req, res) => {
  try {
    const { spotifyTrackId } = req.params;
    const rows = await query('SELECT songId FROM song WHERE spotifySongId = ?', [spotifyTrackId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json({ songId: rows[0].songId });
  } catch (err) {
    console.error('Error fetching song:', err);
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});

// Delete a single song
router.delete('/songs/:songId', async (req, res) => {
  try {
    const songId = req.params.songId;
    
    await query('DELETE FROM userfavorites WHERE songId = ?', [songId]);
    const result = await query('DELETE FROM song WHERE songId = ?', [songId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json({ success: true, message: 'Song deleted successfully', affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Error deleting song:', err);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Delete all songs by artist
router.delete('/artists/:artistId/songs', async (req, res) => {
  try {
    const artistId = req.params.artistId;
    console.log(`[DELETE ARTIST] Starting deletion for artistId: ${artistId}`);
    
    const songs = await query('SELECT songId FROM song WHERE artistId = ?', [artistId]);
    console.log(`[DELETE ARTIST] Found ${songs.length} songs`);
    
    if (songs.length === 0) {
      console.log(`[DELETE ARTIST] No songs found, attempting to delete artist anyway`);
      try {
        await query('DELETE FROM artist WHERE artistId = ?', [artistId]);
        return res.json({ success: true, message: 'Artist deleted', deletedCount: 0 });
      } catch (err) {
        return res.status(404).json({ error: 'Artist not found' });
      }
    }
    
    const songIds = songs.map(s => s.songId);
    const placeholders = songIds.map(() => '?').join(',');
    
    try {
      console.log(`[DELETE ARTIST] Removing ${songIds.length} songs from playlists`);
      await query(`DELETE FROM playlistsongs WHERE songId IN (${placeholders})`, songIds);
    } catch (psErr) {
      console.error('[DELETE ARTIST] Error removing from playlists:', psErr.message);
      throw psErr;
    }
    
    try {
      console.log(`[DELETE ARTIST] Deleting ${songIds.length} from userfavorites`);
      await query(`DELETE FROM userfavorites WHERE songId IN (${placeholders})`, songIds);
    } catch (favErr) {
      console.warn('[DELETE ARTIST] Warning removing favorites:', favErr.message);
    }
    
    console.log(`[DELETE ARTIST] Deleting songs with artistId ${artistId}`);
    const result = await query('DELETE FROM song WHERE artistId = ?', [artistId]);
    console.log(`[DELETE ARTIST] Deleted ${result.affectedRows} songs`);
    
    console.log(`[DELETE ARTIST] Deleting artist record ${artistId}`);
    try {
      const artResult = await query('DELETE FROM artist WHERE artistId = ?', [artistId]);
      console.log(`[DELETE ARTIST] Artist deleted: ${artResult.affectedRows}`);
    } catch (artErr) {
      console.error('[DELETE ARTIST] Error deleting artist record:', artErr.message);
      throw artErr;
    }
    
    res.json({ 
      success: true, 
      message: `Deleted all songs by artist ${artistId}`, 
      deletedCount: result.affectedRows 
    });
  } catch (err) {
    console.error('[DELETE ARTIST] Error:', err);
    res.status(500).json({ error: 'Failed to delete artist songs: ' + err.message });
  }
});

module.exports = router;
