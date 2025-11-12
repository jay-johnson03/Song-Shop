// imports
const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config(); //reads from the .env file

const app = express();
// trust proxy for correct protocol when behind tunnels
app.set('trust proxy', true);
const HTTP_PORT = Number(process.env.PORT || 3000);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);

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

// Debug endpoint to inspect computed redirect URI
app.get('/debug-redirect', (req, res) => {
  res.json({
    protocol: req.protocol,
    host: req.get('host'),
    computedRedirectUri: getRedirectUri(req),
    envRedirectUri: process.env.SPOTIFY_REDIRECT_URI || null,
    note: 'Ensure this exact URI is added to Spotify Dashboard > Redirect URIs'
  });
});

// Block direct requests to .ejs files from static middleware (prevents downloads)
app.use((req, res, next) => {
  if (req.path.endsWith('.ejs')) {
    return res.status(404).send('Not Found');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Optional legacy media path
const legacyMedia = path.join(process.cwd(), 'src', 'main', 'resources', 'static', 'media');
if (fs.existsSync(legacyMedia)) app.use('/media', express.static(legacyMedia));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

const CERT_FILE = path.join(__dirname, 'localhost.pem');
const KEY_FILE = path.join(__dirname, 'localhost-key.pem');
const useHttps = fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE);

// Build redirect URI dynamically based on the incoming request, or allow overriding via env
function getRedirectUri(req) {
  if (process.env.SPOTIFY_REDIRECT_URI) return process.env.SPOTIFY_REDIRECT_URI;
  // For localhost development, Spotify allows HTTP on localhost/127.0.0.1.
  // Force HTTP callback on the HTTP_PORT to avoid self-signed cert issues.
  if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
    const host = `${req.hostname}:${HTTP_PORT}`;
    return `http://${host}/callback`;
  }
  const host = req.get('host'); // e.g., yourdomain.com
  const scheme = req.protocol;  // http or https
  return `${scheme}://${host}/callback`;
}

app.get('/login', (req, res) => {
  if (!CLIENT_ID) return res.status(500).send('SPOTIFY_CLIENT_ID not set');
  const scope = 'user-read-private user-read-email';
  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope,
    redirect_uri: redirectUri,
  });
  const authorizeUrl = 'https://accounts.spotify.com/authorize?' + params.toString();
  console.log('[OAuth] Using redirect_uri:', redirectUri, process.env.SPOTIFY_REDIRECT_URI ? '(from .env override)' : '(computed)');
  console.log('[OAuth] Authorize URL:', authorizeUrl);
  res.redirect(authorizeUrl);
});

app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    if (!CLIENT_ID || !CLIENT_SECRET) return res.status(500).send('Spotify credentials missing');
    // Use the same redirect_uri that was sent to Spotify (from env or computed)
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || getRedirectUri(req);

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error('Token exchange failed:', tokenRes.status, txt, 'redirect_uri was', redirectUri);
      return res.status(502).send('Failed to exchange code for token');
    }

    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    if (!access_token) return res.status(502).send('No access token returned');

    // Redirect to home page with access token in URL so client can store it
    res.redirect(`/?access_token=${encodeURIComponent(access_token)}`);
  } catch (err) {
    console.error('Callback error', err);
    res.status(500).send('Internal server error');
  }
});

// Start HTTPS server on HTTP_PORT (3000) for Spotify OAuth
if (useHttps) {
  const options = { key: fs.readFileSync(KEY_FILE), cert: fs.readFileSync(CERT_FILE) };
  https.createServer(options, app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`HTTPS server running at https://localhost:${HTTP_PORT}`);
    console.log(`Also accessible at https://127.0.0.1:${HTTP_PORT}`);
    console.log(`Redirect URI from .env: ${process.env.SPOTIFY_REDIRECT_URI || 'not set'}`);
  });
} else {
  console.error('ERROR: HTTPS certificates not found!');
  console.error('Spotify requires HTTPS. Please ensure localhost.pem and localhost-key.pem exist.');
  process.exit(1);
}
