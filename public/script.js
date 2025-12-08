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
                <button class="favorite-btn" title="Add to favorites">♡</button>
                <button class="playlist-btn" title="Add to playlist">📀</button>
                <div class="card-content">
                    <div class="track-name">${track.name}</div>
                    <div class="artist-name">${track.artists[0].name}</div>
                </div>
                <a href="${track.external_urls.spotify}" target="_blank" rel="noopener" title="Listen on Spotify"></a>
            `;
            
            // Add favorite button handler
            const favBtn = card.querySelector('.favorite-btn');
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(track, favBtn);
            });

            // Add playlist button handler
            const playlistBtn = card.querySelector('.playlist-btn');
            playlistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showPlaylistModal(track);
            });
            
            container.appendChild(card);
            
            // Save track to database in background
            saveTrackToDatabase(track, genre).catch(err => console.error('Error saving track:', err));
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

    // Default Spotify editorial playlist id for Top 50 - USA
    const usPlaylistIdDefault = '37i9dQZEVXbLRQDuF5jeBp';
    const globalPlaylistId = '37i9dQZEVXbMDoHDwVN2tF';

    try {
        let playlistId = usPlaylistIdDefault;
        let resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=US&limit=10`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!resp.ok) {
            console.warn('Top 10 fetch failed:', resp.status, resp.statusText);
            if (resp.status === 401) {
                localStorage.removeItem('spotify_access_token');
                container.innerHTML = '<div class="login-message">Session expired. Please <a href="/login-page">login</a> again.</div>';
                return;
            }
            if (resp.status === 404) {
                // Try to discover the current US Top 50 playlist via search
                const queries = ['Top 50 - USA', 'Top 50 USA', 'USA Top 50', 'Top 50 United States'];
                let foundId = null;
                for (const q of queries) {
                    const s = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=playlist&market=US&limit=5`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (!s.ok) continue;
                    const sj = await s.json();
                    const playlists = sj.playlists?.items || [];
                    const editorial = playlists.find(p => p.owner?.id === 'spotify') || playlists.find(p => p.owner?.display_name === 'Spotify');
                    if (editorial) { foundId = editorial.id; break; }
                }
                if (foundId) {
                    console.info('Discovered US Top 50 playlist id:', foundId);
                    playlistId = foundId;
                    resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=US&limit=10`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                } else {
                    // Fallback to Global Top 50
                    console.info('Falling back to Global Top 50');
                    playlistId = globalPlaylistId;
                    resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=US&limit=10`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                }
            }
            if (!resp.ok) {
                container.innerHTML = '<div class="status-message">Unable to load US Top 10 tracks right now. Please refresh or try logging in again.</div>';
                return;
            }
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
            
            // Save track to database in background (Top 10 is US Pop/various)
            saveTrackToDatabase(track, 'Pop').catch(err => console.error('Error saving track:', err));
        });
    } catch (e) {
        console.error('Error loading Top 10:', e);
        container.classList.add('centered');
        container.innerHTML = '<div class="status-message">Error loading Top 10. Please try again.</div>';
    }
}

// Function to save track data to MySQL database
async function saveTrackToDatabase(track, genre) {
    // Capitalize genre name to match database format
    const genreMap = {
        'pop': 'Pop',
        'rock': 'Rock',
        'hip-hop': 'HipHop',
        'indie': 'Indie',
        'rnb': 'RnB',
        'classical': 'Classical'
    };
    
    const genreName = genreMap[genre.toLowerCase()] || genre;
    
    try {
        const response = await fetch('/api/save-track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                spotifyId: track.id,
                title: track.name,
                artistName: track.artists[0]?.name || 'Unknown Artist',
                artistSpotifyId: track.artists[0]?.id || null,
                genre: genreName,
                albumImage: track.album?.images?.[0]?.url || null,
                spotifyUrl: track.external_urls?.spotify || null
            })
        });
        
        if (!response.ok) {
            console.warn('Failed to save track to database:', track.name);
        } else {
            const result = await response.json();
            console.log('✓ Saved to database:', track.name);
            
            // Also save as favorite if user is logged in
            const accessToken = localStorage.getItem('spotify_access_token');
            if (accessToken) {
                try {
                    const userResp = await fetch('https://api.spotify.com/v1/me', {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (userResp.ok) {
                        const userProfile = await userResp.json();
                        // Get the songId from database by querying spotifyId
                        const tracksResp = await fetch(`/api/tracks?limit=1`);
                        if (tracksResp.ok) {
                            const tracksData = await tracksResp.json();
                            // Find the song we just saved
                            const savedSong = tracksData.tracks.find(s => s.spotifySongId === track.id);
                            if (savedSong) {
                                await fetch('/api/favorites', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        spotifyId: userProfile.id,
                                        songId: savedSong.songId
                                    })
                                });
                                console.log('✓ Saved as favorite');
                            }
                        }
                    }
                } catch (favErr) {
                    console.warn('Could not save favorite:', favErr);
                }
            }
        }
    } catch (error) {
        console.error('Database save error:', error);
    }
}

// wire login button if present
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "/login-page";
  });
}

// ADMIN LINK HANDLING
async function revealAdminLinkIfAuthorized() {
    const adminId = window.ADMIN_SPOTIFY_ID || '';
    if (!adminId) return; // Not configured
    const link = document.getElementById('admin-link');
    if (!link) return;
    const token = localStorage.getItem('spotify_access_token');
    if (!token) return; // Need login
    try {
        const resp = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const profile = await resp.json();
        if (profile.id && profile.id === adminId) {
            link.style.display = 'inline-block';
        }
    } catch (e) {
        console.warn('Admin check failed:', e);
    }
}

// Run after DOM load
document.addEventListener('DOMContentLoaded', revealAdminLinkIfAuthorized);

// Toggle favorite function
async function toggleFavorite(track, favBtn) {
    const accessToken = localStorage.getItem('spotify_access_token');
    if (!accessToken) {
        alert('Please login first to favorite songs');
        window.location.href = '/login-page';
        return;
    }

    try {
        // Get user profile
        const userResp = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!userResp.ok) {
            alert('Session expired. Please login again.');
            return;
        }
        const userProfile = await userResp.json();
        const spotifyId = userProfile.id;

        // Get the songId from database
        const tracksResp = await fetch('/api/tracks?limit=1000');
        if (!tracksResp.ok) return;
        const tracksData = await tracksResp.json();
        const savedSong = tracksData.tracks.find(s => s.spotifySongId === track.id);

        if (!savedSong) {
            console.warn('Song not found in database yet');
            return;
        }

        // Check if already favorited
        const favResp = await fetch(`/api/favorites/${spotifyId}`);
        if (!favResp.ok) return;
        const favData = await favResp.json();
        const isFavorited = favData.favorites.some(fav => fav.songId === savedSong.songId);

        if (isFavorited) {
            // Remove favorite
            const deleteResp = await fetch(`/api/favorites/${spotifyId}/${savedSong.songId}`, {
                method: 'DELETE'
            });
            if (deleteResp.ok) {
                favBtn.classList.remove('favorited');
                favBtn.textContent = '♡';
            }
        } else {
            // Add favorite
            const addResp = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    spotifyId: spotifyId,
                    songId: savedSong.songId
                })
            });
            if (addResp.ok) {
                favBtn.classList.add('favorited');
                favBtn.textContent = '♥';
            }
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Function to show playlist selection modal
async function showPlaylistModal(track) {
    const spotifyId = localStorage.getItem('spotify_user_id');
    if (!spotifyId) {
        alert('Please log in to add songs to playlists');
        return;
    }

    try {
        const resp = await fetch(`/api/playlists/${spotifyId}`);
        if (!resp.ok) {
            alert('Failed to load playlists');
            return;
        }
        const data = await resp.json();
        const playlists = data.playlists || [];

        if (playlists.length === 0) {
            alert('You don\'t have any playlists yet. Create one first!');
            return;
        }

        // Create modal
        const modalDiv = document.createElement('div');
        modalDiv.className = 'playlist-modal-overlay';
        modalDiv.onclick = closePlaylistModal;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'playlist-modal';
        contentDiv.onclick = (e) => e.stopPropagation();
        
        const title = document.createElement('h3');
        title.textContent = 'Add to Playlist';
        contentDiv.appendChild(title);
        
        const desc = document.createElement('p');
        desc.style.color = '#666';
        desc.style.marginBottom = '15px';
        desc.textContent = `Select a playlist to add "${track.name}":`;
        contentDiv.appendChild(desc);
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'playlist-options';
        
        playlists.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'playlist-option';
            btn.textContent = p.playlistName;
            btn.onclick = () => addSongToPlaylist(p.playlistId, track.id, spotifyId);
            optionsDiv.appendChild(btn);
        });
        contentDiv.appendChild(optionsDiv);
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-modal-btn';
        closeBtn.textContent = 'Cancel';
        closeBtn.onclick = closePlaylistModal;
        contentDiv.appendChild(closeBtn);
        
        modalDiv.appendChild(contentDiv);
        document.body.appendChild(modalDiv);
    } catch (error) {
        console.error('Error showing playlist modal:', error);
        alert('Failed to load playlists');
    }
}

function closePlaylistModal() {
    const modal = document.querySelector('.playlist-modal-overlay');
    if (modal) modal.remove();
}

async function addSongToPlaylist(playlistId, spotifyTrackId, spotifyId) {
    try {
        // First, get the song ID from database using spotify track ID
        const songResp = await fetch(`/api/songs/spotify/${spotifyTrackId}`);
        if (!songResp.ok) {
            alert('Failed to find song in database');
            closePlaylistModal();
            return;
        }
        const songData = await songResp.json();
        const songId = songData.songId;

        // Add song to playlist
        const resp = await fetch(`/api/playlists/${playlistId}/songs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotifyId, songId })
        });
        
        if (resp.ok) {
            alert('Song added to playlist!');
            closePlaylistModal();
        } else {
            const error = await resp.json();
            alert('Error: ' + (error.error || 'Failed to add song'));
        }
    } catch (error) {
        console.error('Error adding song to playlist:', error);
        alert('Failed to add song to playlist');
    }
}
