-- Make sure im using the correct database
USE SongShop;

-- Show count first
SELECT COUNT(*) AS 'Total Songs in Database' FROM Song;

-- Show all songs
SELECT 
    s.songTitle AS 'Song Title', 
    a.artistName AS 'Artist', 
    g.genreName AS 'Genre',
    s.createdAt AS 'Date Added'
FROM Song s 
JOIN Artist a ON s.artistId = a.artistId 
JOIN Genre g ON s.genreId = g.genreId 
ORDER BY s.createdAt DESC;
