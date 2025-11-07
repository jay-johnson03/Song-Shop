// Spotify API configuration
const config = {
    clientId: '6a2285e744264aa5a4486a062f4b4fcc', // Your Spotify Client ID
    redirectUri: 'https://song-shop-spotify.onrender.com/callback.html',
    scope: 'user-read-private user-read-email',
    authUrl: 'https://accounts.spotify.com/authorize'
};

// Function to generate a random state string
function generateRandomState(length = 16) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Function to initiate Spotify login
function loginWithSpotify() {
    const state = generateRandomState();
    localStorage.setItem('spotify_auth_state', state);

    const args = new URLSearchParams({
        response_type: 'token',
        client_id: config.clientId,
        scope: config.scope,
        redirect_uri: config.redirectUri,
        state: state
    });

    window.location = `${config.authUrl}?${args}`;
}

// Function to handle the callback from Spotify
function handleCallback() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const state = params.get('state');
    const storedState = localStorage.getItem('spotify_auth_state');

    if (accessToken && state === storedState) {
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.removeItem('spotify_auth_state');
        window.location.href = '/index.html'; // Redirect to home page
    }
}

// Function to check if user is logged in
function isLoggedIn() {
    return !!localStorage.getItem('spotify_access_token');
}

// Function to log out
function logout() {
    localStorage.removeItem('spotify_access_token');
    window.location.href = '/login.html';
}

// Update login button state
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

// Call updateLoginState when the page loads
document.addEventListener('DOMContentLoaded', updateLoginState);
