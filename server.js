// imports
const express = require('express');
const path = require('path');
require('dotenv').config();

let mysql = null;
try {
  mysql = require('mysql2');
} catch(e) {
  console.warn('mysql2 not installed - database features disabled');
}

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



// Block direct requests to .ejs files
app.use((req, res, next) => {
  if (req.path.endsWith('.ejs')) return res.status(404).send('Not Found');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

// MySQL connection (optional - simpler setup)
let db = null;
let dbEnabled = false;

if (mysql && process.env.DB_HOST) {
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'songshop',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    multipleStatements: true
  });

  db.connect((err) => {
    if (err) {
      console.warn('⚠ MySQL connection failed:', err.message);
      console.log('  Server will run without database features');
      dbEnabled = false;
    } else {
      console.log('✓ MySQL database connected successfully');
      dbEnabled = true;
    }
  });
} else {
  console.log('⚠ Database not configured - server will run without database features');
}

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
  // Return early if database is not enabled
  if (!dbEnabled || !db) {
    return res.status(200).json({ success: false, message: 'Database not available' });
  }

  try {
    const { spotifyId, title, artistName, artistSpotifyId, genre, albumImage, spotifyUrl } = req.body;
    
    if (!spotifyId || !title || !artistName || !genre) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use callback-based queries with promises
    const query = (sql, params) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // 1. Insert or get genre
    let genreRows = await query('SELECT genreId FROM Genre WHERE genreName = ?', [genre]);
    
    let genreId;
    if (genreRows.length === 0) {
      const genreResult = await query('INSERT INTO Genre (genreName) VALUES (?)', [genre]);
      genreId = genreResult.insertId;
    } else {
      genreId = genreRows[0].genreId;
    }

    // 2. Insert or update artist
    let artistId;
    if (artistSpotifyId) {
      artistId = parseInt(artistSpotifyId.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000);
    } else {
      artistId = Math.floor(Math.random() * 1000000);
    }

    await query(
      'INSERT INTO Artist (artistId, artistName, genreId) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE artistName = VALUES(artistName), genreId = VALUES(genreId)',
      [artistId, artistName, genreId]
    );

    // 3. Insert or update song
    const songId = parseInt(spotifyId.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000);
    
    await query(
      'INSERT INTO Song (songId, songTitle, artistId, genreId) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE songTitle = VALUES(songTitle), artistId = VALUES(artistId), genreId = VALUES(genreId)',
      [songId, title, artistId, genreId]
    );

    res.json({ 
      success: true, 
      message: 'Track saved to database',
      data: { songId, artistId, genreId }
    });
  } catch (error) {
    console.error('Error saving track:', error);
    res.status(500).json({ error: 'Failed to save track to database' });
  }
});

// API endpoint to get all saved tracks
app.get('/api/tracks', (req, res) => {
  if (!dbEnabled || !db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  db.query(`
    SELECT s.songId, s.songTitle, a.artistName, g.genreName
    FROM Song s
    JOIN Artist a ON s.artistId = a.artistId
    JOIN Genre g ON s.genreId = g.genreId
    ORDER BY s.songId DESC
    LIMIT 100
  `, (err, rows) => {
    if (err) {
      console.error('Error fetching tracks:', err);
      return res.status(500).json({ error: 'Failed to fetch tracks' });
    }
    res.json({ tracks: rows });
  });
});

// API endpoint to get tracks by genre
app.get('/api/tracks/genre/:genre', (req, res) => {
  if (!dbEnabled || !db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const genre = req.params.genre;
  db.query(`
    SELECT s.songId, s.songTitle, a.artistName, g.genreName
    FROM Song s
    JOIN Artist a ON s.artistId = a.artistId
    JOIN Genre g ON s.genreId = g.genreId
    WHERE g.genreName = ?
    ORDER BY s.songId DESC
  `, [genre], (err, rows) => {
    if (err) {
      console.error('Error fetching tracks by genre:', err);
      return res.status(500).json({ error: 'Failed to fetch tracks' });
    }
    res.json({ tracks: rows });
  });
});

// Start HTTP server
app.listen(PORT, 'localhost', () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Redirect URI: ${REDIRECT_URI}`);
  if (dbEnabled) console.log('✓ Database connected\n');
  else console.log('⚠ Database not connected\n');
});
