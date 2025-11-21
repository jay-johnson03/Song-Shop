USE SongShop;

-- Drop tables in reverse order of dependencies (foreign keys first)
DROP TABLE IF EXISTS UserFavorites;
DROP TABLE IF EXISTS PlaylistSongs;
DROP TABLE IF EXISTS Song;
DROP TABLE IF EXISTS Artist;
DROP TABLE IF EXISTS Playlist;
DROP TABLE IF EXISTS UserTable;
DROP TABLE IF EXISTS Genre;

-- Create Genre table
CREATE TABLE Genre (
    genreId INT AUTO_INCREMENT PRIMARY KEY,
    genreName VARCHAR(50) NOT NULL UNIQUE
);

-- Create Artist table
CREATE TABLE Artist (
    artistId INT AUTO_INCREMENT PRIMARY KEY,
    artistName VARCHAR(100) NOT NULL,
    genreId INT NOT NULL,
    FOREIGN KEY (genreId) REFERENCES Genre(genreId)
);

-- Create Song table with Spotify fields
CREATE TABLE Song (
    songId INT AUTO_INCREMENT PRIMARY KEY,
    songTitle VARCHAR(200) NOT NULL,
    artistId INT NOT NULL,
    genreId INT NOT NULL,
    spotifyId VARCHAR(100) UNIQUE,
    imageUrl VARCHAR(500),
    previewUrl VARCHAR(500),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artistId) REFERENCES Artist(artistId),
    FOREIGN KEY (genreId) REFERENCES Genre(genreId)
);

-- Create Playlist table
CREATE TABLE Playlist (
    playlistId INT AUTO_INCREMENT PRIMARY KEY,
    playlistName VARCHAR(100) NOT NULL
);

-- Create PlaylistSongs junction table
CREATE TABLE PlaylistSongs (
    playlistId INT,
    songId INT,
    PRIMARY KEY (playlistId, songId),
    FOREIGN KEY (playlistId) REFERENCES Playlist(playlistId),
    FOREIGN KEY (songId) REFERENCES Song(songId)
);

-- Create User table
CREATE TABLE UserTable (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    userName VARCHAR(100) NOT NULL,
    userEmail VARCHAR(100) UNIQUE NOT NULL
);

-- Create UserFavorites table
CREATE TABLE UserFavorites (
    userId INT,
    songId INT,
    favoritedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, songId),
    FOREIGN KEY (userId) REFERENCES UserTable(userId),
    FOREIGN KEY (songId) REFERENCES Song(songId)
);
