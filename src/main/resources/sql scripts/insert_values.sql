USE songshop;

-- Insert genres
INSERT INTO Genre (genreName) VALUES
('Pop'),
('Rock'),
('HipHop'),
('RnB'),
('Classical'),
('Indie');

-- Insert artists (link genreId from Genre table)
INSERT INTO Artist (artistId, artistName, genreId) VALUES
(201, 'Dua Lipa', 1),
(202, 'Harry Styles', 1),
(203, 'Queen', 2),
(204, 'Nirvana', 2),
(205, 'Travis Scott', 3),
(206, 'Kendrick Lamar', 3),
(207, 'Kiana Lede', 4),
(208, 'Muni Long', 4),
(209, 'Ludwig van Beethoven', 5),
(210, 'Claude Debussy', 5),
(211, 'Clairo', 6),
(212, 'FINNEAS', 6);

-- Insert songs
INSERT INTO Song (songId, songTitle, artistId, genreId) VALUES
(101, 'Levitating', 201, 1),
(102, 'As It Was', 202, 1),
(103, 'Bohemian Rhapsody', 203, 2),
(104, 'Smells Like Teen Spirit', 204, 2),
(105, 'SICKO MODE', 205, 3),
(106, 'HUMBLE.', 206, 3),
(107, 'Ur Best Friend', 207, 4),
(108, 'Made for Me', 208, 4),
(109, 'Moonlight Sonata', 209, 5),
(110, 'Clair de Lune', 210, 5),
(111, 'Pretty Girl', 211, 6),
(112, 'Break My Heart Again', 212, 6);

-- Insert playlists
INSERT INTO Playlist (playlistId, playlistName) VALUES 
(1, 'Pop Playlist'),
(2, 'Rock Playlist'),
(3, 'HipHop Playlist'),
(4, 'R&B Playlist'),
(5, 'Classical Playlist'),
(6, 'Indie Playlist');

-- Add songs to playlists
INSERT INTO PlaylistSongs (playlistId, songId) VALUES
(1, 101),(1, 102),
(2, 103),(2, 104),
(3, 105),(3, 106),
(4, 107),(4, 108),
(5, 109),(5, 110),
(6, 111),(6, 112);

-- Insert users
INSERT INTO UserTable (userId, userName, userEmail) VALUES
(123, 'Jay Johnson', 'jay.johnson@example.com'),
(124, 'Symphony Veloz', 'symphony.veloz@example.com'),
(125, 'John Doe', 'john.doe@example.com'),
(126, 'Shine Xu', 'shine.xu@example.com');

-- Insert user favorites
INSERT INTO UserFavorites (userId, songId, favoritedAt) VALUES
(123, 101,'2025-10-01'),
(123, 103,'2025-10-02'),
(124, 102,'2025-10-01'),
(124, 106,'2025-10-03'),
(125, 109,'2025-10-01'),
(125, 111,'2025-10-06'),
(126, 105,'2025-10-11'),
(126, 112,'2025-10-01');




