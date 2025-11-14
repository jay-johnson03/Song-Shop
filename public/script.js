// Function to load songs from Spotify API based on genre
async function loadSongs(genre) {
    const container = document.getElementById('songs');
    if (!container) return;
    
    const accessToken = localStorage.getItem('spotify_access_token');
    if (!accessToken) {
        container.classList.add('centered');
        container.innerHTML = '<div class="login-message">Please <a href="/login-page">login with Spotify</a> to view songs.</div>';
        return;
    }

    container.classList.add('centered');
    container.innerHTML = '<div class="status-message">Loading songs...</div>';

    // Different search queries based on genre
    const queries = {
        'pop': '(genre:pop) year:2020-2025',
        'rock': '(genre:rock) year:2020-2025',
        'hip-hop': '(genre:hip-hop) year:2020-2025',
        'indie': '(genre:indie) year:2020-2025',
        'rnb': '(genre:r&b) year:2020-2025',
        'classical': '(genre:classical) year:2020-2025'
    };

    // Generate random offset for variety on each page load (reduced range for better 2020-2025 coverage)
    const randomOffset = Math.floor(Math.random() * 200);

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
            container.classList.add('centered');
            container.innerHTML = '<div class="status-message">No songs found for this genre.</div>';
            return;
        }

        // STRICT filter: only tracks with release_date between 2020-2025 (inclusive)
        const filteredTracks = data.tracks.items.filter(track => {
            if (!track.album || !track.album.release_date) return false;
            const releaseYear = parseInt(track.album.release_date.substring(0, 4));
            return releaseYear >= 2020 && releaseYear <= 2025;
        });

        if (filteredTracks.length === 0) {
            container.classList.add('centered');
            container.innerHTML = '<div class="status-message">No songs found for this genre from 2020-2025. Try refreshing.</div>';
            return;
        }

        // Shuffle for variety on each page load
        for (let i = filteredTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filteredTracks[i], filteredTracks[j]] = [filteredTracks[j], filteredTracks[i]];
        }

        // We have tracks: remove centered state so grid lays out normally
        container.classList.remove('centered');
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
        container.classList.add('centered');
        container.innerHTML = '<div class="status-message">Error loading songs. Please try again later.</div>';
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

// Load Top 10 tracks from Spotify's official "Top 50 - Global" playlist
async function loadTopGlobal() {
    const container = document.getElementById('top10');
    if (!container) return;

    const accessToken = localStorage.getItem('spotify_access_token');
    if (!accessToken) {
        container.classList.add('centered');
        container.innerHTML = '<div class="login-message">Please <a href="/login-page">login with Spotify</a> to view the Top 10 tracks.</div>';
        return;
    }

    container.classList.add('centered');
    container.innerHTML = '<div class="status-message">Loading Top 10…</div>';

    // Spotify editorial playlist id for Top 50 - USA
    const playlistId = '37i9dQZEVXbLRQDuF5jeBp';

    try {
        const resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=US&limit=10`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!resp.ok) {
            console.warn('Top 10 fetch failed:', resp.status, resp.statusText);
            if (resp.status === 401) {
                localStorage.removeItem('spotify_access_token');
                container.innerHTML = '<div class="login-message">Session expired. Please <a href="/login-page">login</a> again.</div>';
                return;
            }
            container.innerHTML = '<div class="status-message">Unable to load US Top 10 tracks right now. Please refresh or try logging in again.</div>';
            return;
        }

        const data = await resp.json();
        const items = (data.items || []).map(i => i.track).filter(Boolean);

        if (items.length === 0) {
            container.innerHTML = '<div class="status-message">No tracks available right now.</div>';
            return;
        }

        // We have tracks; render as cards similar to genre pages
        container.classList.remove('centered');
        container.innerHTML = '';

        items.forEach(track => {
            const card = document.createElement('div');
            card.className = 'card';
            const image = track.album?.images?.[0]?.url || '';
            card.innerHTML = `
                ${image ? `<img src="${image}" alt="${track.name}">` : ''}
                <div class="card-content">
                    <div class="track-name">${track.name}</div>
                    <div class="artist-name">${track.artists?.[0]?.name || ''}</div>
                </div>
                <a href="${track.external_urls.spotify}" target="_blank" rel="noopener" title="Listen on Spotify"></a>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error('Error loading Top 10:', e);
        container.classList.add('centered');
        container.innerHTML = '<div class="status-message">Error loading Top 10. Please try again.</div>';
    }
}

// wire login button if present
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "/login-page";
  });
}
