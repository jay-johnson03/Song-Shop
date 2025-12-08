// Spotify OAuth configuration 
// The server handles code exchange; client just stores the token

// Initiate Spotify login via server endpoint
function loginWithSpotify() {
    // Redirect to server's /login endpoint, which will redirect to Spotify auth
    window.location.href = '/login';
}

// Handle callback from server after token exchange
// The server will redirect here with ?access_token=...
async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');

    if (accessToken) {
        localStorage.setItem('spotify_access_token', accessToken);
        // Fetch and store user's Spotify ID
        await getUserSpotifyId();
        // Clear the URL to remove the token from browser history
        window.history.replaceState({}, document.title, '/');
        // Redirect home
        window.location.href = '/';
    } else {
        console.error('No access token returned from server callback');
    }
}

// Check for access token in URL (when server redirects with ?access_token=...)
// This runs on every page load to handle the redirect after auth
async function checkAndStoreAccessToken() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem('spotify_access_token', accessToken);
        // Fetch and store user's Spotify ID
        await getUserSpotifyId();
        // Remove the token from URL to keep it secure
        window.history.replaceState({}, document.title, '/');
    }
}

// Check if user is logged in
function isLoggedIn() {
    return !!localStorage.getItem('spotify_access_token');
}

// Get user's Spotify ID and store it
async function getUserSpotifyId() {
    const accessToken = localStorage.getItem('spotify_access_token');
    if (!accessToken) return null;

    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const profile = await response.json();
        if (profile.id) {
            localStorage.setItem('spotify_user_id', profile.id);
            return profile.id;
        }
    } catch (err) {
        console.error('Error fetching user profile:', err);
    }
    return null;
}

// Log out: clear token and redirect to login
function logout() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_user_id');
    window.location.href = '/login-page';
}

// Update login button state on page load
async function updateLoginState() {
    const loginLink = document.getElementById('spotify-login');
    if (!loginLink) return;
    
    if (isLoggedIn()) {
        // If logged in but don't have user ID yet, fetch it
        if (!localStorage.getItem('spotify_user_id')) {
            await getUserSpotifyId();
        }
        loginLink.textContent = 'Logout';
        loginLink.onclick = logout;
        loginLink.classList.add('logged-in');
    } else {
        loginLink.textContent = 'Login with Spotify';
        loginLink.onclick = loginWithSpotify;
        loginLink.classList.remove('logged-in');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // First, check if we just received a token from server callback
    checkAndStoreAccessToken();
    // Then update the login button state
    updateLoginState();
});