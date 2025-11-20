# Song-Shop

A music discovery app powered by Spotify that lets you explore different genres and saves your discoveries to a MySQL database. Just log in with Spotify and find songs that match your mood and vibes!

## Features

- 🎵 Browse songs by genre (Pop, Rock, Hip-Hop, R&B, Classical, Indie)
- 🔝 View Top 10 tracks in the US
- 💾 Automatically saves discovered songs, artists, and genres to MySQL database
- 🔐 Secure Spotify OAuth authentication
- 🎨 Beautiful card-based UI with album art
- 📅 Only shows songs from 2020-2025
- 🔄 Randomized selection on each page refresh

## Database Integration

This app automatically saves all Spotify tracks you discover to your MySQL database with the following structure:

### Tables
- **Genre**: Stores music genres
- **Artist**: Stores artist information linked to genres
- **Song**: Stores song details linked to artists and genres
- **Playlist**: Stores playlist information
- **PlaylistSongs**: Junction table for playlist-song relationships
- **UserTable**: Stores user information
- **UserFavorites**: Tracks user favorites

### How It Works
When you browse songs on any genre page or view the Top 10:
1. Songs are fetched from Spotify API
2. Each track is automatically saved to your database in the background
3. The system handles duplicate prevention using Spotify IDs
4. Artist and genre information is linked properly via foreign keys

## Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- MySQL database (local or remote)
- Spotify Developer Account

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `mysql2` - MySQL database driver
- `ejs` - Template engine
- `dotenv` - Environment variable management
- And other required packages

### 2. Set Up MySQL Database

Run the SQL scripts in order:

```bash
# In your MySQL client
source public/sql scripts/create_tables.sql
source public/sql scripts/create_views.sql
source public/sql scripts/insert_values.sql
```

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Fill in your credentials:

```env
# Spotify OAuth Credentials (from https://developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=https://127.0.0.1:3000/callback

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_database_password_here
DB_NAME=songshop
DB_PORT=3306
```

### 4. Set Up Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `https://127.0.0.1:3000/callback`
4. Copy Client ID and Client Secret to your `.env` file

### 5. HTTPS Certificates

The app requires HTTPS certificates (already included as `localhost.pem` and `localhost-key.pem`). If you need to regenerate them, the app will guide you.

### 6. Start the Server

```bash
npm start
```

Visit: `https://127.0.0.1:3000`

## API Endpoints

### Database API Routes

- `POST /api/save-track` - Save a Spotify track to database
  ```json
  {
    "spotifyId": "track_id",
    "title": "Song Title",
    "artistName": "Artist Name",
    "artistSpotifyId": "artist_id",
    "genre": "Pop",
    "albumImage": "image_url",
    "spotifyUrl": "spotify_url"
  }
  ```

- `GET /api/tracks` - Get all saved tracks (limit 100)
- `GET /api/tracks/genre/:genre` - Get tracks by genre

### Spotify OAuth Routes

- `GET /login` - Initiate Spotify OAuth flow
- `GET /callback` - OAuth callback handler
- `GET /login-page` - Login page

### Page Routes

- `GET /` - Home page with Top 10 US tracks
- `GET /genre/:name` - Genre-specific pages (pop, rock, hip-hop, indie, rnb, classical)

## Usage

1. Click "Login with Spotify" on any page
2. Authorize the app with your Spotify account
3. Browse genres or view the Top 10 US tracks
4. Click any song card to open it in Spotify
5. All songs you view are automatically saved to your database

## Database Schema

```sql
Genre (genreId, genreName)
Artist (artistId, artistName, genreId)
Song (songId, songTitle, artistId, genreId)
Playlist (playlistId, playlistName)
PlaylistSongs (playlistId, songId)
UserTable (userId, userName, userEmail)
UserFavorites (userId, songId, favoritedAt)
```

## Troubleshooting

### Database Connection Issues
- Check that MySQL is running
- Verify credentials in `.env`
- Ensure `songshop` database exists
- Check the server console for connection errors

### Spotify Authentication Issues
- Verify redirect URI matches exactly in Spotify Dashboard
- Check that certificates exist
- Ensure CLIENT_ID and CLIENT_SECRET are correct

### No Songs Loading
- Check browser console for errors
- Verify Spotify access token is stored (localStorage)
- Try logging out and back in

## Technologies Used

- **Backend**: Node.js, Express
- **Database**: MySQL with mysql2 driver
- **Frontend**: EJS templates, Vanilla JavaScript
- **API**: Spotify Web API
- **Authentication**: OAuth 2.0
- **Security**: HTTPS with self-signed certificates

