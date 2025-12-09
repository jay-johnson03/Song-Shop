const express = require('express');
const router = express.Router();
const { query } = require('../db/query');
const { addTrack } = require('../db/add-track');

// Get user's playlists
router.get('/:spotifyId', async (req, res) => {
  try {
    const { spotifyId } = req.params;
    const userRows = await query('SELECT userId FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const playlists = await query(`
      SELECT p.playlistId, p.playlistName, p.description, p.createdAt, COUNT(ps.songId) as songCount
      FROM playlist p
      LEFT JOIN playlistsongs ps ON p.playlistId = ps.playlistId
      WHERE p.userId = ?
      GROUP BY p.playlistId
      ORDER BY p.createdAt DESC
    `, [userRows[0].userId]);
    
    res.json({ playlists });
  } catch (err) {
    console.error('Error fetching playlists:', err);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Create a new playlist
router.post('/', async (req, res) => {
  try {
    const { spotifyId, playlistName, description } = req.body;

    if (!spotifyId || !playlistName || playlistName.trim().length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (playlistName.length > 100) {
      return res.status(400).json({ error: 'Playlist name too long (max 100 characters)' });
    }

    const userRows = await query('SELECT userId FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await query('INSERT INTO playlist (userId, playlistName, description) VALUES (?, ?, ?)', 
      [userRows[0].userId, playlistName, description || '']);
    
    res.json({ success: true, playlistId: result.insertId, message: 'Playlist created successfully' });
  } catch (err) {
    console.error('Error creating playlist:', err.message, err.code);
    res.status(500).json({ error: 'Failed to create playlist', details: err.message });
  }
});

// Get songs in a playlist
router.get('/:playlistId/songs', async (req, res) => {
  try {
    const { playlistId } = req.params;

    const songs = await query(`
      SELECT s.songId, s.songTitle, a.artistName, s.spotifySongId
      FROM playlistsongs ps
      JOIN song s ON ps.songId = s.songId
      JOIN artist a ON s.artistId = a.artistId
      WHERE ps.playlistId = ?
      ORDER BY s.songTitle
    `, [playlistId]);

    res.json({ songs });
  } catch (err) {
    console.error('Error fetching playlist songs:', err);
    res.status(500).json({ error: 'Failed to fetch playlist songs' });
  }
});

// Add song to playlist
router.post('/:playlistId/songs', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { spotifyId, songId, spotifyTrackId, trackData } = req.body;

    if (!spotifyId) {
      return res.status(400).json({ error: 'Missing spotifyId' });
    }

    if (!songId && !spotifyTrackId) {
      return res.status(400).json({ error: 'Missing songId or spotifyTrackId' });
    }

    // Verify ownership
    const playlistRows = await query(`
      SELECT p.userId FROM playlist p
      JOIN usertable u ON p.userId = u.userId
      WHERE p.playlistId = ? AND u.spotifyId = ?
    `, [playlistId, spotifyId]);

    if (playlistRows.length === 0) {
      return res.status(403).json({ error: 'You cannot modify this playlist' });
    }

    let finalSongId = songId;

    // If songId not provided, try to get it from spotifyTrackId or save the track
    if (!finalSongId && spotifyTrackId) {
      const songRows = await query('SELECT songId FROM song WHERE spotifySongId = ?', [spotifyTrackId]);
      
      if (songRows.length > 0) {
        finalSongId = songRows[0].songId;
      } else if (trackData) {
        // Song doesn't exist, save it first
        try {
          await addTrack({
            songTitle: trackData.title,
            artistName: trackData.artistName,
            genreName: trackData.genre,
            spotifyId: spotifyTrackId,
            imageUrl: trackData.albumImage,
            previewUrl: trackData.spotifyUrl
          });
          
          // Get the newly created song ID
          const newSongRows = await query('SELECT songId FROM song WHERE spotifySongId = ?', [spotifyTrackId]);
          if (newSongRows.length > 0) {
            finalSongId = newSongRows[0].songId;
          }
        } catch (saveErr) {
          console.error('Error saving track:', saveErr);
          return res.status(500).json({ error: 'Failed to save track to database' });
        }
      }
    }

    if (!finalSongId) {
      return res.status(400).json({ error: 'Could not determine song ID' });
    }

    // Check if song already in playlist
    const existingRows = await query('SELECT * FROM playlistsongs WHERE playlistId = ? AND songId = ?', 
      [playlistId, finalSongId]);
    
    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'Song already in playlist' });
    }

    await query('INSERT INTO playlistsongs (playlistId, songId) VALUES (?, ?)', [playlistId, finalSongId]);
    res.json({ success: true, message: 'Song added to playlist' });
  } catch (err) {
    console.error('Error adding song to playlist:', err);
    res.status(500).json({ error: 'Failed to add song to playlist' });
  }
});

// Delete playlist
router.delete('/:playlistId', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { spotifyId } = req.body;

    if (!spotifyId) {
      return res.status(400).json({ error: 'spotifyId required' });
    }

    // Verify ownership
    const playlistRows = await query(`
      SELECT p.playlistId FROM playlist p
      JOIN usertable u ON p.userId = u.userId
      WHERE p.playlistId = ? AND u.spotifyId = ?
    `, [playlistId, spotifyId]);

    if (playlistRows.length === 0) {
      return res.status(403).json({ error: 'You cannot delete this playlist' });
    }

    // Delete songs in playlist first
    await query('DELETE FROM playlistsongs WHERE playlistId = ?', [playlistId]);
    // Delete playlist
    await query('DELETE FROM playlist WHERE playlistId = ?', [playlistId]);
    
    res.json({ success: true, message: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('Error deleting playlist:', err);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Remove song from playlist
router.delete('/:playlistId/songs/:songId', async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const { spotifyId } = req.body;

    if (!spotifyId) {
      return res.status(400).json({ error: 'spotifyId required' });
    }

    // Verify ownership
    const playlistRows = await query(`
      SELECT p.playlistId FROM playlist p
      JOIN usertable u ON p.userId = u.userId
      WHERE p.playlistId = ? AND u.spotifyId = ?
    `, [playlistId, spotifyId]);

    if (playlistRows.length === 0) {
      return res.status(403).json({ error: 'You cannot modify this playlist' });
    }

    await query('DELETE FROM playlistsongs WHERE playlistId = ? AND songId = ?', [playlistId, songId]);
    res.json({ success: true, message: 'Song removed from playlist' });
  } catch (err) {
    console.error('Error removing song from playlist:', err);
    res.status(500).json({ error: 'Failed to remove song from playlist' });
  }
});

module.exports = router;
