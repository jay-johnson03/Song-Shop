// Lightweight frontend helper to request a Spotify client-credentials token
// from the backend and expose it on window.spotifyAccessToken
(function () {
  async function fetchToken() {
    try {
      const res = await fetch('/api/spotify/token');
      if (!res.ok) {
        console.error('Failed to fetch Spotify token', res.status);
        return null;
      }
      const token = await res.text();
      // store on window for other scripts to use
      window.spotifyAccessToken = token;
      return token;
    } catch (err) {
      console.error('Error fetching Spotify token', err);
      return null;
    }
  }

  // Expose helper API
  window.spotifyAuth = {
    getToken: () => window.spotifyAccessToken,
    fetchToken,
  };

  // Fetch immediately on page load and refresh periodically (50 min)
  fetchToken();
  setInterval(fetchToken, 50 * 60 * 1000);
})();

// Attempt to detect if user is logged in via session (server-side) and update login link
(async function updateLoginState() {
  try {
    const res = await fetch('/api/spotify/me');
    const loginLink = document.getElementById('spotify-login');
    if (!loginLink) return;
    if (res.ok) {
      const profile = await res.json();
      const name = profile.display_name || (profile.email ? profile.email.split('@')[0] : 'User');
      loginLink.textContent = 'Logged in: ' + name;
      loginLink.href = '#';
      loginLink.classList.add('logged-in');
    } else {
      loginLink.textContent = 'Login with Spotify';
      loginLink.href = '/api/spotify/login';
      loginLink.classList.remove('logged-in');
    }
  } catch (err) {
    // ignore
  }
})();
