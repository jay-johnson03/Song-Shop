// Function to load songs from Spotify API based on genre
async function loadSongs(genre) {
    const container = document.getElementById('songs');
    if (!container) return;
    
    const accessToken = localStorage.getItem('spotify_access_token');
    if (!accessToken) {
        container.innerHTML = '<p>Please <a href="/login-page">login with Spotify</a> to view songs.</p>';
        return;
    }

    container.innerHTML = '<p>Loading songs...</p>';

    // Different search queries based on genre
    const queries = {
        'pop': '(genre:pop) year:2020-2025',
        'rock': '(genre:rock) year:2020-2025',
        'hip-hop': '(genre:hip-hop) year:2020-2025',
        'indie': '(genre:indie) year:2020-2025',
        'rnb': '(genre:r&b) year:2020-2025',
        'classical': '(genre:classical) year:2020-2025'
    };

    // Generate random offset for variety on each page load (0-950 to ensure we get 50 results)
    const randomOffset = Math.floor(Math.random() * 950);

    try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(queries[genre])}&type=track&limit=50&offset=${randomOffset}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('spotify_access_token');
                window.location.href = '/login-page';
                return;
            }
            throw new Error('Failed to fetch songs');
        }

        const data = await response.json();
        container.innerHTML = ''; // Clear loading message

        if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
            container.innerHTML = '<p>No songs found for this genre.</p>';
            return;
        }

        // Filter tracks by release year (2020-2025)
        const filteredTracks = data.tracks.items.filter(track => {
            const releaseYear = parseInt(track.album.release_date.substring(0, 4));
            return releaseYear >= 2020 && releaseYear <= 2025;
        });

        if (filteredTracks.length === 0) {
            container.innerHTML = '<p>No songs found for this genre in the specified time range.</p>';
            return;
        }

        filteredTracks.forEach(track => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const image = track.album.images[0]?.url || '';
            card.innerHTML = `
                ${image ? `<img src="${image}" alt="${track.name}">` : ''}
                <div class="card-content">
                    <div class="track-name">${track.name}</div>
                    <div class="artist-name">${track.artists[0].name}</div>
                </div>
                <a href="${track.external_urls.spotify}" target="_blank" rel="noopener" title="Listen on Spotify"></a>
            `;
            
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading songs:', error);
        container.innerHTML = '<p>Error loading songs. Please try again later.</p>';
    }
}

// Function to load featured tracks on the home page
async function loadFeatured() {
    const accessToken = localStorage.getItem('spotify_access_token');
    if (!accessToken) {
        // Don't redirect on home page, just don't show featured
        return;
    }

    const container = document.querySelector('.container');
    if (!container) return;

    try {
        const response = await fetch('https://api.spotify.com/v1/browse/featured-playlists?limit=4', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('spotify_access_token');
                return;
            }
            throw new Error('Failed to fetch featured playlists');
        }

        const data = await response.json();
        
        const html = `
            <h3>Featured Playlists</h3>
            <div class="songs-grid" id="featured"></div>
        `;
        container.insertAdjacentHTML('beforeend', html);
        
        const featured = document.getElementById('featured');
        data.playlists.items.forEach(playlist => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                ${playlist.images[0] ? `<img src="${playlist.images[0].url}" alt="${playlist.name}">` : ''}
                <p>${playlist.name}</p>
                <a href="${playlist.external_urls.spotify}" target="_blank" rel="noopener">Open in Spotify</a>
            `;
            featured.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading featured playlists:', error);
    }
}

// wire login button if present
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "/login-page";
  });
}

// const mysql = require('mysql2');

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '0203',
//   database: 'songshop',
//   port: 3306
// });

// connection.connect(err => {
//   if (err) {
//     console.error('Connection error:', err);
//     return;
//   }
//   console.log('Connected to MySQL!');
// });