// Spotify OAuth configuration (server-side authorization code flow)
// The server handles code exchange; client just stores the token

// Initiate Spotify login via server endpoint
function loginWithSpotify() {
    // Redirect to server's /login endpoint, which will redirect to Spotify auth
    window.location.href = '/login';
}

// Handle callback from server after token exchange
// The server will redirect here with ?access_token=...
function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');

    if (accessToken) {
        localStorage.setItem('spotify_access_token', accessToken);
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
function checkAndStoreAccessToken() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem('spotify_access_token', accessToken);
        // Remove the token from URL to keep it secure
        window.history.replaceState({}, document.title, '/');
    }
}

// Check if user is logged in (token in localStorage)
function isLoggedIn() {
    return !!localStorage.getItem('spotify_access_token');
}

// Log out: clear token and redirect to login
function logout() {
    localStorage.removeItem('spotify_access_token');
    window.location.href = '/login-page';
}

// Update login button state on page load
function updateLoginState() {
    const loginLink = document.getElementById('spotify-login');
    if (!loginLink) return;
    
    if (isLoggedIn()) {
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