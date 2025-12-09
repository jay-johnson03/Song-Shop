// Admin panel functions
window.ADMIN_SPOTIFY_ID = window.ADMIN_SPOTIFY_ID || '';

let currentOffset = 0;
const pageSize = 100;

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load messages if switching to messages tab
    if (tabName === 'messages') {
        loadMessages();
    }
}

async function loadStats() {
    try {
        const resp = await fetch('/api/stats');
        if (!resp.ok) return;
        const stats = await resp.json();
        document.getElementById('songCount').textContent = stats.songs;
        document.getElementById('artistCount').textContent = stats.artists;
        document.getElementById('genreCount').textContent = stats.genres;
    } catch (e) {
        console.warn('Stats load failed:', e);
    }
}

async function loadData(reset=false) {
    if (reset) currentOffset = 0;
    try {
        const response = await fetch(`/api/tracks?limit=${pageSize}&offset=${currentOffset}`);
        const data = await response.json();

        loadStats();

        const tbody = document.getElementById('songsTable');
        if (reset) tbody.innerHTML = '';

        if (data.tracks && data.tracks.length > 0) {
            const rowsHtml = data.tracks.map(track => `
                <tr>
                    <td>${track.imageUrl ? `<img src="${track.imageUrl}" alt="${track.songTitle}" class="album-img">` : '🎵'}</td>
                    <td><strong>${track.songTitle}</strong></td>
                    <td>${track.artistName}</td>
                    <td><span class="genre-badge">${track.genreName}</span></td>
                    <td class="timestamp">-</td>
                    <td>${track.spotifySongId ? `<a href="https://open.spotify.com/track/${track.spotifySongId}" target="_blank" class="spotify-link">Open in Spotify</a>` : '-'}</td>
                </tr>
            `).join('');
            tbody.insertAdjacentHTML('beforeend', rowsHtml);

            const existingLoadMore = document.getElementById('loadMoreRow');
            if (existingLoadMore) existingLoadMore.remove();
            const total = data.totalSongs;
            currentOffset += data.limit;
            if (currentOffset < total) {
                tbody.insertAdjacentHTML('beforeend', `
                  <tr id="loadMoreRow">
                    <td colspan="6" class="load-more-cell">
                      <button class="refresh-btn" onclick="loadData(false)">Load More (${currentOffset}/${total})</button>
                    </td>
                  </tr>`);
            }
        } else if (reset) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No songs saved yet.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('songsTable').innerHTML = '<tr><td colspan="6" class="no-data error-cell">Error loading data.</td></tr>';
    }
}

async function loadArtists() {
    const select = document.getElementById('artistSelect');
    const info = document.getElementById('artistInfo');
    if (select) select.innerHTML = '<option value="">Loading artists...</option>';
    if (info) info.classList.remove('show');

    try {
        // Server caps at 1000, so request 1000 max
        const response = await fetch('/api/tracks?limit=1000');
        if (!response.ok) {
            throw new Error(`Tracks fetch failed (${response.status})`);
        }
        const data = await response.json();
        const tracks = data.tracks || [];

        // Get unique artists with counts
        const artistMap = new Map();
        tracks.forEach(track => {
            if (!artistMap.has(track.artistName)) {
                artistMap.set(track.artistName, { name: track.artistName, count: 0, artistId: track.artistId });
            }
            artistMap.get(track.artistName).count++;
        });

        const artists = Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (select) {
            select.innerHTML = '<option value="">Select an artist...</option>';
            artists.forEach(artist => {
                const option = document.createElement('option');
                option.value = artist.name;
                option.textContent = `${artist.name} (${artist.count} songs)`;
                option.dataset.artistId = artist.artistId;
                select.appendChild(option);
            });

            select.onchange = function() {
                if (this.value) {
                    const selected = artists.find(a => a.name === this.value);
                    document.getElementById('songCountByArtist').textContent = selected?.count || 0;
                    document.getElementById('artistInfo').classList.add('show');
                } else {
                    document.getElementById('artistInfo').classList.remove('show');
                }
            };
        }
    } catch (error) {
        console.error('Error loading artists:', error);
        if (select) select.innerHTML = '<option value="">Failed to load artists</option>';
        alert('Failed to load artists. Please refresh the page.');
    }
}

async function deleteArtistSongs() {
    const artistName = document.getElementById('artistSelect').value;
    if (!artistName) {
        alert('Please select an artist');
        return;
    }

    if (!confirm(`Are you sure you want to delete all songs by "${artistName}"? This cannot be undone.`)) {
        return;
    }

    try {
        // Get the artistId from the select option's data attribute
        const selectEl = document.getElementById('artistSelect');
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        const artistId = selectedOption?.dataset?.artistId;
        
        if (!artistId) {
            alert('Artist ID not found. Please reload and try again.');
            return;
        }

        const deleteResponse = await fetch(`/api/artists/${artistId}/songs`, {
            method: 'DELETE'
        });

        if (!deleteResponse.ok) {
            const errText = await deleteResponse.text();
            throw new Error(`Delete failed: ${errText}`);
        }

        const result = await deleteResponse.json();
        
        const messageDiv = document.getElementById('deleteMessage');
        messageDiv.classList.add('show', 'success');
        messageDiv.innerHTML = `<strong>✓ Success!</strong> Deleted ${result.deletedCount} songs by "${artistName}"`;
        
        // Refresh stats
        loadStats();
        
        // Reset form
        document.getElementById('artistSelect').value = '';
        document.getElementById('artistInfo').classList.remove('show');
        
        // Reload artists list
        setTimeout(loadArtists, 1000);
    } catch (error) {
        console.error('Error deleting artist songs:', error);
        const messageDiv = document.getElementById('deleteMessage');
        messageDiv.classList.add('show', 'error');
        messageDiv.innerHTML = '<strong>✗ Error!</strong> Failed to delete songs. Please try again.';
        alert('Failed to delete songs for this artist. See console for details.');
    }
}

async function mergeDuplicateArtists() {
    const messageDiv = document.getElementById('dedupeMessage');
    if (!confirm('Merge duplicate artists by name and repoint their songs to a single record?')) {
        return;
    }

    if (messageDiv) {
        messageDiv.className = 'delete-message show';
        messageDiv.textContent = 'Merging duplicate artists...';
    }

    try {
        const response = await fetch('/api/admin/merge-duplicate-artists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminSpotifyId: window.ADMIN_SPOTIFY_ID })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || 'Failed to merge');
        }

        const result = await response.json();
        if (messageDiv) {
            messageDiv.className = 'delete-message show success';
            messageDiv.innerHTML = `<strong>✓ Done.</strong> ${result.songsRepointed || 0} songs repointed; ${result.artistsRemoved || 0} duplicate artists removed.`;
        }

        loadStats();
        loadArtists();
        loadData(true);
    } catch (error) {
        console.error('Error merging duplicate artists:', error);
        if (messageDiv) {
            messageDiv.className = 'delete-message show error';
            messageDiv.innerHTML = `<strong>✗ Error!</strong> Failed to merge duplicate artists. ${error.message || ''}`;
        }
        alert(`Failed to merge duplicate artists. ${error.message || ''}`);
    }
}

async function loadMessages() {
    try {
        const response = await fetch('/api/admin/messages');
        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        const messages = data.messages || [];

        const container = document.getElementById('messages-list');

        if (messages.length === 0) {
            container.innerHTML = '<p class="no-messages">No messages found.</p>';
            return;
        }

        container.innerHTML = messages.map(msg => `
            <div class="admin-message-item">
                <div class="message-header-admin">
                    <div class="message-info">
                        <strong>${msg.userName}</strong>
                        <span class="message-date">${new Date(msg.createdAt).toLocaleString()}</span>
                        ${msg.isRestricted ? '<span class="restricted-badge">BLOCKED</span>' : ''}
                    </div>
                    <div class="message-actions-admin">
                        ${msg.isRestricted ? 
                            `<button onclick="unblockUser(${msg.userId})" class="unblock-btn">Unblock User</button>` : 
                            `<button onclick="blockUser(${msg.userId})" class="block-btn">Block User</button>`
                        }
                        <button onclick="deleteMessageAdmin(${msg.messageId})" class="delete-msg-btn">Delete</button>
                    </div>
                </div>
                <div class="message-text-admin">${msg.messageText}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading messages:', error);
        document.getElementById('messages-list').innerHTML = '<p class="error-text">Failed to load messages.</p>';
    }
}

async function blockUser(userId) {
    if (!confirm('Are you sure you want to block this user from posting messages?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}/restrict`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminSpotifyId: window.ADMIN_SPOTIFY_ID, isRestricted: true })
        });

        if (!response.ok) {
            throw new Error('Failed to block user');
        }

        loadMessages();
        alert('User blocked successfully!');
    } catch (error) {
        console.error('Error blocking user:', error);
        alert('Failed to block user');
    }
}

async function unblockUser(userId) {
    if (!confirm('Are you sure you want to unblock this user?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}/restrict`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminSpotifyId: window.ADMIN_SPOTIFY_ID, isRestricted: false })
        });

        if (!response.ok) {
            throw new Error('Failed to unblock user');
        }

        loadMessages();
        alert('User unblocked successfully!');
    } catch (error) {
        console.error('Error unblocking user:', error);
        alert('Failed to unblock user');
    }
}

async function deleteMessageAdmin(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }

    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotifyId: window.ADMIN_SPOTIFY_ID })
        });

        if (!response.ok) {
            throw new Error('Failed to delete message');
        }

        loadMessages();
        alert('Message deleted successfully!');
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message');
    }
}

// Initial load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadData(true));
} else {
    loadData(true);
}
