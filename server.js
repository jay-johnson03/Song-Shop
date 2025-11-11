// imports
const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config(); //reads from the .env file

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Optional legacy media path
const legacyMedia = path.join(process.cwd(), 'src', 'main', 'resources', 'static', 'media');
if (fs.existsSync(legacyMedia)) app.use('/media', express.static(legacyMedia));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.ejs'));
});

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

const CERT_FILE = path.join(__dirname, 'localhost.pem');
const KEY_FILE = path.join(__dirname, 'localhost-key.pem');
const useHttps = fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE);
const redirectUri = `${useHttps ? 'https' : 'http'}://localhost:${PORT}/callback`;

app.get('/login', (req, res) => {
  if (!CLIENT_ID) return res.status(500).send('SPOTIFY_CLIENT_ID not set');
  const scope = 'user-read-private user-read-email';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope,
    redirect_uri: redirectUri,
  });
  res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
});

app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    if (!CLIENT_ID || !CLIENT_SECRET) return res.status(500).send('Spotify credentials missing');

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
      console.error('Token exchange failed:', tokenRes.status, txt);
      return res.status(502).send('Failed to exchange code for token');
    }

    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    if (!access_token) return res.status(502).send('No access token returned');

    res.redirect(`/index.html?access_token=${encodeURIComponent(access_token)}`);
  } catch (err) {
    console.error('Callback error', err);
    res.status(500).send('Internal server error');
  }
});

if (useHttps) {
  const options = { key: fs.readFileSync(KEY_FILE), cert: fs.readFileSync(CERT_FILE) };
  https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS server running at https://localhost:${PORT}`);
    console.log(`Redirect URI set to: ${redirectUri}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`HTTP server running at http://localhost:${PORT} (no certs found)`);
    console.log(`Redirect URI set to: ${redirectUri}`);
    console.log('To enable HTTPS for Spotify OAuth, add localhost.pem and localhost-key.pem to project root');
  });
}

// using the ejs templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

app.get('/', (req, res) => {
  res.render('index');
});
