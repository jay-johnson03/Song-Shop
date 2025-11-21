// imports
const express = require('express');
const path = require('path');
require('dotenv').config();
const { addTrack } = require('./db/add-track');

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT || 3000);

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
app.get('/api/tracks', (req, res) => {
  const newConnection = require('./db/connection');
  const con = newConnection();
  
  con.connect(err => {
    if (err) {
      console.error('Database connection failed:', err);
      return res.status(503).json({ error: 'Database not available' });
    }

    con.query(`
      SELECT s.songId, s.songTitle, a.artistName, g.genreName, 
             s.spotifyId, s.imageUrl, s.previewUrl, s.createdAt
      FROM Song s
      JOIN Artist a ON s.artistId = a.artistId
      JOIN Genre g ON s.genreId = g.genreId
      ORDER BY s.createdAt DESC
      LIMIT 100
    `, (err, rows) => {
      con.end();
      if (err) {
        console.error('Error fetching tracks:', err);
        return res.status(500).json({ error: 'Failed to fetch tracks' });
      }
      res.json({ tracks: rows });
    });
  });
});

// API endpoint to get tracks by genre
app.get('/api/tracks/genre/:genre', (req, res) => {
  const newConnection = require('./db/connection');
  const con = newConnection();
  const genre = req.params.genre;
  
  con.connect(err => {
    if (err) {
      console.error('Database connection failed:', err);
      return res.status(503).json({ error: 'Database not available' });
    }

    con.query(`
      SELECT s.songId, s.songTitle, a.artistName, g.genreName
      FROM Song s
      JOIN Artist a ON s.artistId = a.artistId
      JOIN Genre g ON s.genreId = g.genreId
      WHERE g.genreName = ?
      ORDER BY s.songId DESC
    `, [genre], (err, rows) => {
      con.end();
      if (err) {
        console.error('Error fetching tracks by genre:', err);
        return res.status(500).json({ error: 'Failed to fetch tracks' });
      }
      res.json({ tracks: rows });
    });
  });
});

// Start HTTP server
app.listen(PORT, 'localhost', () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Redirect URI: ${REDIRECT_URI}\n`);
});
