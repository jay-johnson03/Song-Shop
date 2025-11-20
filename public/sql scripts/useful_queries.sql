USE songshop;

-- VIEWING DATA
-- -----------------------

-- View all songs with artist and genre information
SELECT 
    s.songId,
    s.songTitle,
    a.artistName,
    g.genreName
FROM Song s
JOIN Artist a ON s.artistId = a.artistId
JOIN Genre g ON s.genreId = g.genreId
ORDER BY s.songId DESC
LIMIT 50;

-- View songs by specific genre
SELECT 
    s.songTitle,
    a.artistName
FROM Song s
JOIN Artist a ON s.artistId = a.artistId
JOIN Genre g ON s.genreId = g.genreId
WHERE g.genreName = 'Pop'
ORDER BY s.songTitle;

-- Count songs per in each genre
SELECT 
    g.genreName,
    COUNT(s.songId) AS songCount
FROM Genre g
LEFT JOIN Song s ON g.genreId = s.genreId
GROUP BY g.genreId, g.genreName
ORDER BY songCount DESC;

-- View all artists with genre
SELECT 
    a.artistId,
    a.artistName,
    g.genreName
FROM Artist a
JOIN Genre g ON a.genreId = g.genreId
ORDER BY a.artistName;

-- Count songs per artist
SELECT 
    a.artistName,
    COUNT(s.songId) AS songCount
FROM Artist a
LEFT JOIN Song s ON a.artistId = s.artistId
GROUP BY a.artistId, a.artistName
ORDER BY songCount DESC
LIMIT 20;

-- SEARCH QUERIES
-- ----------------------------------------

-- Search for songs by title (partial match)
SELECT 
    s.songTitle,
    a.artistName,
    g.genreName
FROM Song s
JOIN Artist a ON s.artistId = a.artistId
JOIN Genre g ON s.genreId = g.genreId
WHERE s.songTitle LIKE '%love%'
ORDER BY s.songTitle;

-- Search for songs by artist name
SELECT 
    s.songTitle,
    a.artistName,
    g.genreName
FROM Song s
JOIN Artist a ON s.artistId = a.artistId
JOIN Genre g ON s.genreId = g.genreId
WHERE a.artistName LIKE '%Taylor%'
ORDER BY s.songTitle;

-- Find all genres available
SELECT DISTINCT genreName
FROM Genre
ORDER BY genreName;


-- ============================================
-- PLAYLIST QUERIES
-- ============================================

-- View all playlists
SELECT * FROM Playlist;

-- View songs in a specific playlist
SELECT 
    p.playlistName,
    s.songTitle,
    a.artistName
FROM PlaylistSongs ps
JOIN Playlist p ON ps.playlistId = p.playlistId
JOIN Song s ON ps.songId = s.songId
JOIN Artist a ON s.artistId = a.artistId
WHERE p.playlistId = 1
ORDER BY s.songTitle;

-- Count songs per playlist
SELECT 
    p.playlistName,
    COUNT(ps.songId) AS songCount
FROM Playlist p
LEFT JOIN PlaylistSongs ps ON p.playlistId = ps.playlistId
GROUP BY p.playlistId, p.playlistName
ORDER BY songCount DESC;


-- ============================================
-- USER FAVORITES QUERIES
-- ============================================

-- View all users
SELECT * FROM UserTable;

-- View user's favorite songs
SELECT 
    u.userName,
    s.songTitle,
    a.artistName,
    uf.favoritedAt
FROM UserFavorites uf
JOIN UserTable u ON uf.userId = u.userId
JOIN Song s ON uf.songId = s.songId
JOIN Artist a ON s.artistId = a.artistId
WHERE u.userId = 123
ORDER BY uf.favoritedAt DESC;

-- Count favorites per user
SELECT 
    u.userName,
    COUNT(uf.songId) AS favoriteCount
FROM UserTable u
LEFT JOIN UserFavorites uf ON u.userId = uf.userId
GROUP BY u.userId, u.userName
ORDER BY favoriteCount DESC;

-- Most favorited songs across all users
SELECT 
    s.songTitle,
    a.artistName,
    COUNT(uf.userId) AS favoriteCount
FROM Song s
JOIN Artist a ON s.artistId = a.artistId
LEFT JOIN UserFavorites uf ON s.songId = uf.songId
GROUP BY s.songId, s.songTitle, a.artistName
HAVING favoriteCount > 0
ORDER BY favoriteCount DESC
LIMIT 10;


-- ============================================
-- STATISTICS & ANALYTICS
-- ============================================

-- Total counts of everything
SELECT 
    (SELECT COUNT(*) FROM Genre) AS totalGenres,
    (SELECT COUNT(*) FROM Artist) AS totalArtists,
    (SELECT COUNT(*) FROM Song) AS totalSongs,
    (SELECT COUNT(*) FROM Playlist) AS totalPlaylists,
    (SELECT COUNT(*) FROM UserTable) AS totalUsers;

-- Most popular genre (by song count)
SELECT 
    g.genreName,
    COUNT(s.songId) AS songCount
FROM Genre g
LEFT JOIN Song s ON g.genreId = s.genreId
GROUP BY g.genreId, g.genreName
ORDER BY songCount DESC
LIMIT 1;

-- Artists with most songs in database
SELECT 
    a.artistName,
    g.genreName,
    COUNT(s.songId) AS songCount
FROM Artist a
LEFT JOIN Song s ON a.artistId = s.artistId
JOIN Genre g ON a.genreId = g.genreId
GROUP BY a.artistId, a.artistName, g.genreName
ORDER BY songCount DESC
LIMIT 10;

-- Recently added songs (by songId as proxy for insertion order)
SELECT 
    s.songTitle,
    a.artistName,
    g.genreName
FROM Song s
JOIN Artist a ON s.artistId = a.artistId
JOIN Genre g ON s.genreId = g.genreId
ORDER BY s.songId DESC
LIMIT 20;


-- ============================================
-- DATA MANAGEMENT
-- ============================================

-- Find duplicate song titles
SELECT 
    songTitle,
    COUNT(*) AS duplicateCount
FROM Song
GROUP BY songTitle
HAVING duplicateCount > 1
ORDER BY duplicateCount DESC;

-- Find songs without a genre
SELECT 
    s.songId,
    s.songTitle,
    a.artistName
FROM Song s
JOIN Artist a ON s.artistId = a.artistId
LEFT JOIN Genre g ON s.genreId = g.genreId
WHERE g.genreId IS NULL;

-- Find artists without songs
SELECT 
    a.artistId,
    a.artistName,
    g.genreName
FROM Artist a
JOIN Genre g ON a.genreId = g.genreId
LEFT JOIN Song s ON a.artistId = s.artistId
WHERE s.songId IS NULL;


-- ============================================
-- VIEWS (Already created in create_views.sql)
-- ============================================

-- Use existing views
SELECT * FROM TotalArtists;
SELECT * FROM TotalSpotifySongs;


-- Note: OUTFILE requires FILE privilege and specific path permissions
