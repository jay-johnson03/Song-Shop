// imports
const express = require('express');
const path = require('path');
require('dotenv').config();
const { addTrack } = require('./db/add-track');

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT || 3000);

// Helper function to execute database queries
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const con = require('./db/connection')();
    con.connect(err => {
      if (err) return reject(err);
      con.query(sql, params, (err, rows) => {
        con.end();
        if (err) return reject(err);
        resolve(rows);
      });
    });
  });
}

// Set EJS as the view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// Render index.ejs for home page
app.get('/', (req, res) => {
  res.render('index');
});

// Genre page routes (renders EJS from public/genre/)
const genres = ['pop', 'rock', 'hip-hop', 'indie', 'rnb', 'classical'];

// Main genre routes: /genre/:name
app.get('/genre/:name', (req, res) => {
  const name = req.params.name;
  if (!genres.includes(name)) return res.redirect('/');
  res.render(`genre/${name}`);
});

// Login page route (must be before static middleware)
app.get('/login-page', (req, res) => {
  res.render('login');
});

// Admin page route
app.get('/admin', (req, res) => {
  res.render('admin');
});



// Block direct requests to .ejs files
app.use((req, res, next) => {
  if (req.path.endsWith('.ejs')) return res.status(404).send('Not Found');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

// Redirect URI for Spotify OAuth
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${PORT}/callback`;

app.get('/login', (req, res) => {
  if (!CLIENT_ID) return res.status(500).send('SPOTIFY_CLIENT_ID not set');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: 'user-read-private user-read-email',
    redirect_uri: REDIRECT_URI,
  });
  res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
});

app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ 
        grant_type: 'authorization_code', 
        code, 
        redirect_uri: REDIRECT_URI 
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenRes.status);
      return res.status(502).send('Failed to exchange code for token');
    }

    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(502).send('No access token returned');

    // Fetch user profile from Spotify
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (userRes.ok) {
      const userProfile = await userRes.json();
      
      // Save or update user in database
      const con = require('./db/connection')();
      con.connect((err) => {
        if (!err && userProfile.id) {
          const spotifyId = userProfile.id;
          const userName = userProfile.display_name || 'Spotify User';
          const userEmail = userProfile.email || '';
          const profilePicUrl = userProfile.images?.[0]?.url || '';

          // Check if user exists, otherwise create
          con.query(
            'SELECT userId FROM usertable WHERE spotifyId = ?',
            [spotifyId],
            (err, rows) => {
              if (err) {
                con.end();
                return;
              }
              
              if (rows.length > 0) {
                // Update existing user
                con.query(
                  'UPDATE usertable SET userName = ?, userEmail = ?, profilePicUrl = ? WHERE spotifyId = ?',
                  [userName, userEmail, profilePicUrl, spotifyId],
                  (err) => {
                    con.end();
                    console.log('User updated:', userName);
                  }
                );
              } else {
                // Create new user
                con.query(
                  'SELECT IFNULL(MAX(userId), 0) + 1 AS nextId FROM usertable',
                  (err, result) => {
                    if (err) {
                      con.end();
                      return;
                    }
                    const nextUserId = result[0].nextId;
                    con.query(
                      'INSERT INTO usertable (userId, userName, userEmail, spotifyId, profilePicUrl) VALUES (?, ?, ?, ?, ?)',
                      [nextUserId, userName, userEmail, spotifyId, profilePicUrl],
                      (err) => {
                        con.end();
                        console.log('User saved:', userName);
                      }
                    );
                  }
                );
              }
            }
          );
        }
      });
    }

    res.redirect(`/?access_token=${encodeURIComponent(access_token)}`);
  } catch (err) {
    console.error('Callback error', err);
    res.status(500).send('Internal server error');
  }
});

// API endpoint to save song, artist, and genre to database
app.post('/api/save-track', async (req, res) => {
  try {
    const { spotifyId, title, artistName, genre, albumImage, spotifyUrl } = req.body;
    
    if (!spotifyId || !title || !artistName || !genre) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Call the addTrack function from db/add-track.js
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

// API endpoint to get all saved tracks
app.get('/api/tracks', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const countRows = await query('SELECT COUNT(*) AS totalSongs FROM song');
    const totalSongs = countRows[0].totalSongs;

    const tracks = await query(`
      SELECT s.songId, s.songTitle, a.artistName, g.genreName,
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

// Stats endpoint for totals without paging
app.get('/api/stats', async (req, res) => {
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

// API endpoint to get tracks by genre
app.get('/api/tracks/genre/:genre', async (req, res) => {
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

// API endpoint to get user profile by Spotify ID
app.get('/api/user/:spotifyId', async (req, res) => {
  try {
    const rows = await query(
      'SELECT userId, userName, userEmail, profilePicUrl FROM usertable WHERE spotifyId = ?',
      [req.params.spotifyId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// API endpoint to save user favorite
app.post('/api/favorites', async (req, res) => {
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

// API endpoint to get user favorites
app.get('/api/favorites/:spotifyId', async (req, res) => {
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

// API endpoint to delete user favorite
app.delete('/api/favorites/:spotifyId/:songId', async (req, res) => {
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

// API endpoint to delete a single song by songId
app.delete('/api/songs/:songId', async (req, res) => {
  try {
    const songId = req.params.songId;
    
    // First, remove any favorites for this song
    await query('DELETE FROM userfavorites WHERE songId = ?', [songId]);
    
    // Then delete the song
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

// API endpoint to delete all songs by a specific artist
app.delete('/api/artists/:artistId/songs', async (req, res) => {
  try {
    const artistId = req.params.artistId;
    
    // First, get all songIds for this artist
    const songs = await query('SELECT songId FROM song WHERE artistId = ?', [artistId]);
    
    if (songs.length === 0) {
      return res.status(404).json({ error: 'No songs found for this artist' });
    }
    
    const songIds = songs.map(s => s.songId);
    
    // Remove all favorites for these songs - use proper SQL syntax for IN clause
    const placeholders = songIds.map(() => '?').join(',');
    await query(`DELETE FROM userfavorites WHERE songId IN (${placeholders})`, songIds);
    
    // Delete all songs by this artist
    const result = await query('DELETE FROM song WHERE artistId = ?', [artistId]);
    
    res.json({ 
      success: true, 
      message: `Deleted all songs by artist ${artistId}`, 
      deletedCount: result.affectedRows 
    });
  } catch (err) {
    console.error('Error deleting artist songs:', err);
    res.status(500).json({ error: 'Failed to delete artist songs' });
  }
});

// ==================== MESSAGE BOARD ENDPOINTS ====================

// API endpoint to get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await query(`
      SELECT m.messageId, m.messageText, m.createdAt, m.updatedAt, u.userName, u.spotifyId, u.profilePicUrl
      FROM messages m
      JOIN usertable u ON m.userId = u.userId
      WHERE u.isRestricted = 0
      ORDER BY m.createdAt DESC
    `);
    res.json({ messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
});

// API endpoint to post a message
app.post('/api/messages', async (req, res) => {
  try {
    const { spotifyId, messageText } = req.body;
    
    if (!spotifyId || !messageText || messageText.trim().length === 0) {
      return res.status(400).json({ error: 'Missing spotifyId or message text' });
    }

    if (messageText.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }

    const userRows = await query('SELECT userId, isRestricted FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const { userId, isRestricted } = userRows[0];
    if (isRestricted) return res.status(403).json({ error: 'You have been restricted from posting messages' });

    const result = await query(
      'INSERT INTO messages (userId, messageText, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
      [userId, messageText]
    );

    res.json({ success: true, message: 'Message posted successfully', messageId: result.insertId });
  } catch (err) {
    console.error('Error posting message:', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// API endpoint to update a message (user can only edit their own)
app.put('/api/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { spotifyId, messageText } = req.body;

    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    if (messageText.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }

    const msgRows = await query('SELECT userId FROM messages WHERE messageId = ?', [messageId]);
    if (msgRows.length === 0) return res.status(404).json({ error: 'Message not found' });

    const userRows = await query('SELECT userId FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    if (msgRows[0].userId !== userRows[0].userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    await query('UPDATE messages SET messageText = ?, updatedAt = NOW() WHERE messageId = ?', [messageText, messageId]);
    res.json({ success: true, message: 'Message updated successfully' });
  } catch (err) {
    console.error('Error updating message:', err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// API endpoint to delete a message (user can delete own, admin can delete any)
app.delete('/api/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { spotifyId } = req.body;

    const msgRows = await query('SELECT userId FROM messages WHERE messageId = ?', [messageId]);
    if (msgRows.length === 0) return res.status(404).json({ error: 'Message not found' });

    const userRows = await query('SELECT userId, spotifyId FROM usertable WHERE spotifyId = ?', [spotifyId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isAdmin = userRows[0].spotifyId === process.env.ADMIN_SPOTIFY_ID;
    const isOwner = msgRows[0].userId === userRows[0].userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You cannot delete this message' });
    }

    await query('DELETE FROM messages WHERE messageId = ?', [messageId]);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// API endpoint to restrict/unrestrict a user (admin only)
app.put('/api/admin/users/:userId/restrict', async (req, res) => {
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

// API endpoint to get all messages (for admin panel)
app.get('/api/admin/messages', async (req, res) => {
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

// API endpoint to get song ID by Spotify track ID
app.get('/api/songs/spotify/:spotifyTrackId', async (req, res) => {
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

// API endpoint to get user's playlists
app.get('/api/playlists/:spotifyId', async (req, res) => {
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

// API endpoint to create a new playlist
app.post('/api/playlists', async (req, res) => {
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

// API endpoint to add song to playlist
app.post('/api/playlists/:playlistId/songs', async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { spotifyId, songId } = req.body;

    if (!spotifyId || !songId) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Check if song already in playlist
    const existingRows = await query('SELECT * FROM playlistsongs WHERE playlistId = ? AND songId = ?', 
      [playlistId, songId]);
    
    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'Song already in playlist' });
    }

    await query('INSERT INTO playlistsongs (playlistId, songId) VALUES (?, ?)', [playlistId, songId]);
    res.json({ success: true, message: 'Song added to playlist' });
  } catch (err) {
    console.error('Error adding song to playlist:', err);
    res.status(500).json({ error: 'Failed to add song to playlist' });
  }
});

// API endpoint to delete playlist
app.delete('/api/playlists/:playlistId', async (req, res) => {
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

// API endpoint to remove song from playlist
app.delete('/api/playlists/:playlistId/songs/:songId', async (req, res) => {
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

// Start HTTP server
app.listen(PORT, 'localhost', () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Redirect URI: ${REDIRECT_URI}\n`);
});
