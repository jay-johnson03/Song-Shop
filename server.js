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

// Start HTTP server
app.listen(PORT, 'localhost', () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Redirect URI: ${REDIRECT_URI}\n`);
});
