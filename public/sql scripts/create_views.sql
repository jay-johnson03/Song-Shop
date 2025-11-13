USE songshop; 

CREATE VIEW TotalArtists 
AS SELECT SUM(artistId) AS totalArtist
FROM Artist;

CREATE VIEW TotalSpotifySongs
AS SELECT SUM(spotifySongId) AS totalSongs
FROM Song;