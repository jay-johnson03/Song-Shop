const express = require('express');
const router = express.Router();
const { query } = require('../db/query');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

router.get('/login', (req, res) => {
  if (!CLIENT_ID) return res.status(500).send('SPOTIFY_CLIENT_ID not set');
  const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${process.env.PORT || 3000}/callback`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: 'user-read-private user-read-email',
    redirect_uri: REDIRECT_URI,
  });
  res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
});

router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');

    const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${process.env.PORT || 3000}/callback`;
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
      const con = require('../db/connection')();
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

// Get user profile by Spotify ID
router.get('/user/:spotifyId', async (req, res) => {
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

module.exports = router;
