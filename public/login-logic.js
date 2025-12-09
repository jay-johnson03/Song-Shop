// Check if we're already logged in and load profile
function initLoginPage() {
    console.log('initLoginPage called');
    console.log('isLoggedIn:', isLoggedIn());
    if (isLoggedIn()) {
        console.log('User is logged in, loading profile...');
        const accessToken = localStorage.getItem('spotify_access_token');
        
        // Fetch user profile
        fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        })
        .then(response => response.json())
        .then(profile => {
            const name = profile.display_name || (profile.email ? profile.email.split('@')[0] : 'User');
            const profilePic = profile.images?.[0]?.url ? `<img src="${profile.images[0].url}" alt="Profile" class="profile-pic">` : '';
            
            // Store the user's Spotify ID
            localStorage.setItem('spotify_user_id', profile.id);
            
            document.getElementById('profile').innerHTML = `
                ${profilePic}
                <p>Logged in as <strong>${name}</strong></p>
                <button onclick="logout()" class="logout-btn">Logout</button>
            `;
            document.getElementById('login-area').style.display = 'none';
            document.getElementById('profile-tabs').style.display = 'flex';

            // Load and display favorites
            loadUserFavorites(profile.id);

            // Load and display playlists
            loadUserPlaylists(profile.id);
        })
        .catch(() => {
            // If there's an error, clear the token and show login button
            logout();
        });
    }
}

async function loadUserFavorites(spotifyId) {
    try {
        const resp = await fetch(`/api/favorites/${spotifyId}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const favorites = data.favorites || [];

        const grid = document.getElementById('favorites-grid');
        grid.innerHTML = '';

        if (favorites.length === 0) {
            grid.innerHTML = '<p class="no-items-message" style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">No favorites yet. Add some songs!</p>';
            return;
        }

        favorites.forEach(track => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                ${track.imageUrl ? `<img src="${track.imageUrl}" alt="${track.songTitle}">` : '<div class="favorite-card-placeholder">🎵</div>'}
                <button class="favorite-btn favorited" title="Remove from favorites" onclick="removeFavorite('${spotifyId}', ${track.songId}, this); event.stopPropagation();">♥</button>
                <div class="card-content">
                    <div class="track-name">${track.songTitle}</div>
                    <div class="artist-name">${track.artistName}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

async function removeFavorite(spotifyId, songId, btn) {
    try {
        const resp = await fetch(`/api/favorites/${spotifyId}/${songId}`, {
            method: 'DELETE'
        });
        if (resp.ok) {
            btn.parentElement.style.opacity = '0.5';
            btn.textContent = '♡';
            btn.classList.remove('favorited');
            setTimeout(() => {
                btn.parentElement.remove();
            }, 300);
        }
    } catch (error) {
        console.error('Error removing favorite:', error);
    }
}

async function loadUserPlaylists(spotifyId) {
    try {
        const resp = await fetch(`/api/playlists/${spotifyId}`);
        if (!resp.ok) {
            console.error('Failed to fetch playlists');
            return;
        }
        const data = await resp.json();
        const playlists = data.playlists || [];

        const list = document.getElementById('playlists-list');
        
        if (playlists.length === 0) {
            list.innerHTML = '<p class="no-items-message">No playlists yet. Create one to get started!</p>';
            return;
        }

        list.innerHTML = '';

        playlists.forEach(playlist => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
                <div class="playlist-info">
                    <h3>${playlist.playlistName}</h3>
                    <p class="playlist-desc">${playlist.description || 'No description'}</p>
                    <p class="song-count">${playlist.songCount} songs</p>
                </div>
                <div class="playlist-actions">
                    <button onclick="viewPlaylist(${playlist.playlistId}, '${playlist.playlistName}', '${spotifyId}')" class="btn-view">View Songs</button>
                    <button onclick="deletePlaylist(${playlist.playlistId}, '${spotifyId}')" class="btn-delete">Delete</button>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading playlists:', error);
    }
}

async function createPlaylist() {
    const spotifyId = localStorage.getItem('spotify_user_id');
    if (!spotifyId) {
        alert('Please log in first');
        return;
    }

    const playlistName = prompt('Enter playlist name:');
    if (!playlistName || playlistName.trim().length === 0) return;

    const description = prompt('Enter description (optional):');

    try {
        const resp = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotifyId, playlistName, description })
        });
        const data = await resp.json();
        console.log('Create playlist response:', data, 'Status:', resp.status);
        if (data.success) {
            alert('Playlist created successfully!');
            loadUserPlaylists(spotifyId);
        } else {
            alert('Error: ' + (data.details || data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating playlist:', error);
        alert('Failed to create playlist: ' + error.message);
    }
}

async function deletePlaylist(playlistId, spotifyId) {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
        const resp = await fetch(`/api/playlists/${playlistId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotifyId })
        });
        const data = await resp.json();
        if (data.success) {
            alert('Playlist deleted!');
            loadUserPlaylists(spotifyId);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error deleting playlist:', error);
        alert('Failed to delete playlist');
    }
}

async function viewPlaylist(playlistId, playlistName, spotifyId) {
    try {
        const resp = await fetch(`/api/playlists/${playlistId}/songs`);
        if (!resp.ok) {
            alert('Failed to load playlist songs');
            return;
        }
        const data = await resp.json();
        const songs = data.songs || [];

        // Create modal to display songs
        const modalDiv = document.createElement('div');
        modalDiv.className = 'playlist-modal-overlay';
        modalDiv.onclick = () => modalDiv.remove();

        const contentDiv = document.createElement('div');
        contentDiv.className = 'playlist-modal';
        contentDiv.onclick = (e) => e.stopPropagation();

        const title = document.createElement('h3');
        title.textContent = playlistName;
        contentDiv.appendChild(title);

        if (songs.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.color = '#666';
            emptyMsg.textContent = 'No songs in this playlist yet.';
            contentDiv.appendChild(emptyMsg);
        } else {
            const songsList = document.createElement('div');
            songsList.className = 'playlist-songs-list';

            songs.forEach(song => {
                const songItem = document.createElement('div');
                songItem.className = 'playlist-song-item';
                songItem.innerHTML = `
                    <div class="song-info">
                        <strong>${song.songTitle}</strong>
                        <span>${song.artistName}</span>
                    </div>
                    <button class="btn-remove" onclick="removeSongFromPlaylist(${playlistId}, ${song.songId}, '${spotifyId}', '${playlistName}')">−</button>
                `;
                songsList.appendChild(songItem);
            });
            contentDiv.appendChild(songsList);
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-modal-btn';
        closeBtn.textContent = 'Close';
        closeBtn.onclick = () => modalDiv.remove();
        contentDiv.appendChild(closeBtn);

        modalDiv.appendChild(contentDiv);
        document.body.appendChild(modalDiv);
    } catch (error) {
        console.error('Error viewing playlist:', error);
        alert('Failed to load playlist songs');
    }
}

async function removeSongFromPlaylist(playlistId, songId, spotifyId, playlistName) {
    if (!confirm('Remove this song from the playlist?')) return;

    try {
        const resp = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotifyId })
        });
        if (resp.ok) {
            alert('Song removed from playlist');
            // Close and reopen the modal to refresh
            document.querySelector('.playlist-modal-overlay').remove();
            viewPlaylist(playlistId, playlistName, spotifyId);
            // Also refresh the playlist list to update song count
            loadUserPlaylists(spotifyId);
        } else {
            const error = await resp.json();
            alert('Error: ' + (error.error || 'Failed to remove song'));
        }
    } catch (error) {
        console.error('Error removing song:', error);
        alert('Failed to remove song');
    }
}

function switchProfileTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.profile-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}
