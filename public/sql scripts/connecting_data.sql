USE songshop;

SELECT * FROM Song 
ORDER BY songTitle;
SELECT * FROM Artist
ORDER BY artistName;
SELECT * FROM UserTable;
SELECT * FROM UserFavorites
ORDER BY userId; 
SELECT * FROM Playlist
ORDER BY userId; 
SELECT * FROM playlistsongs;
SELECT * FROM Messages;