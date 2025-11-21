# Song-Shop

A music app powered by Spotify and Node that lets you explore different genres and saves your discoveries to a MySQL database. Just log in with Spotify and find songs that match your mood and vibes!

## Features

- Browse songs by genre (Pop, Rock, Hip-Hop, R&B, Classical, Indie)
- View Top 10 tracks in the US
- Secure Spotify OAuth authentication
- Only shows songs from 2020-2025
- Randomized selection on each page refresh

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

## Technologies Used

- **Backend**: Node.js, Express
- **Database**: MySQL
- **Frontend**: EJS templates, Vanilla JavaScript
- **API**: Spotify Web API
- **Authentication**: OAuth 2.0
- **Security**: HTTPS with self-signed certificates

