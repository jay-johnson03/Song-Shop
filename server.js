// imports
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT || 3000);

// Set EJS as the view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// View routes
app.get('/', (req, res) => res.render('index'));
app.get('/login-page', (req, res) => res.render('login'));
app.get('/admin', (req, res) => res.render('admin'));

// Genre page routes
const genres = ['pop', 'rock', 'hip-hop', 'indie', 'rnb', 'classical'];
app.get('/genre/:name', (req, res) => {
  const name = req.params.name;
  if (!genres.includes(name)) return res.redirect('/');
  res.render(`genre/${name}`);
});

// Block direct requests to .ejs files
app.use((req, res, next) => {
  if (req.path.endsWith('.ejs')) return res.status(404).send('Not Found');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/', require('./routes/auth'));
app.use('/api', require('./routes/tracks'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));

// Start HTTP server
app.listen(PORT, 'localhost', () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Redirect URI: ${process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${PORT}/callback`}\n`);
});
