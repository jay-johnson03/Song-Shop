const newConnection = require('./connection');

async function addTrack(trackData) {
  return new Promise((resolve, reject) => {
    const con = newConnection();
    const { songTitle, artistName, genreName, spotifyId, imageUrl, previewUrl } = trackData;

    con.connect((err) => {
      if (err) {
        console.error('Connection failed:', err);
        return reject(err);
      }
      console.log('Connected to the database!');

      // 1. Insert or get Genre
      const genreQuery = `INSERT INTO genre (genreName) VALUES (?) 
                          ON DUPLICATE KEY UPDATE genreId=genreId`;
      
      con.query(genreQuery, [genreName], (err, result) => {
        if (err) {
          con.end();
          return reject(err);
        }
        
        // Get the genreId (either newly inserted or existing)
        let genreId = result.insertId;
        if (genreId === 0) {
          // Duplicate key, need to fetch existing ID
          con.query('SELECT genreId FROM genre WHERE genreName = ?', [genreName], (err, rows) => {
            if (err) {
              con.end();
              return reject(err);
            }
            genreId = rows[0].genreId;
            insertArtist(genreId);
          });
        } else {
          insertArtist(genreId);
        }
      });

      function insertArtist(genreId) {
        // 2. Check if artist exists by name (avoid duplicate artist rows)
        con.query('SELECT artistId, genreId FROM artist WHERE artistName = ?', [artistName], (err, rows) => {
          if (err) {
            con.end();
            return reject(err);
          }

          if (rows.length > 0) {
            const artistId = rows[0].artistId;
            const needsGenreUpdate = rows[0].genreId !== genreId;

            const proceed = () => insertSong(artistId, genreId);

            if (needsGenreUpdate) {
              con.query('UPDATE artist SET genreId = ? WHERE artistId = ?', [genreId, artistId], (updateErr) => {
                if (updateErr) {
                  con.end();
                  return reject(updateErr);
                }
                proceed();
              });
            } else {
              proceed();
            }
          } else {
            // Get next available artistId
            con.query('SELECT IFNULL(MAX(artistId), 0) + 1 AS nextId FROM artist', (err, result) => {
              if (err) {
                con.end();
                return reject(err);
              }
              const nextArtistId = result[0].nextId;
              // Insert new artist with explicit ID
              con.query('INSERT INTO artist (artistId, artistName, genreId) VALUES (?, ?, ?)', [nextArtistId, artistName, genreId], (err, result) => {
                if (err) {
                  con.end();
                  return reject(err);
                }
                insertSong(nextArtistId, genreId);
              });
            });
          }
        });
      }

      function insertSong(artistId, genreId) {
        // 3. Check if song exists by spotifyId
        con.query('SELECT songId FROM song WHERE spotifySongId = ?', [spotifyId], (err, rows) => {
          if (err) {
            con.end();
            return reject(err);
          }

          if (rows.length > 0) {
            // Song already exists, update it
            const songId = rows[0].songId;
            con.query('UPDATE song SET songTitle = ?, artistId = ?, genreId = ?, imageUrl = ? WHERE songId = ?', 
              [songTitle, artistId, genreId, imageUrl, songId], (err, result) => {
                con.end((endErr) => {
                  if (endErr) console.error('Error closing connection:', endErr);
                  else console.log('Connection closed gracefully.');
                });

                if (err) {
                  return reject(err);
                }
                console.log("Track updated successfully:", songTitle);
                resolve(result);
              });
          } else {
            // Get next available songId
            con.query('SELECT IFNULL(MAX(songId), 0) + 1 AS nextId FROM song', (err, result) => {
              if (err) {
                con.end();
                return reject(err);
              }
              const nextSongId = result[0].nextId;
              // Insert new song with explicit ID
              con.query('INSERT INTO song (songId, songTitle, artistId, genreId, spotifySongId, imageUrl) VALUES (?, ?, ?, ?, ?, ?)', 
                [nextSongId, songTitle, artistId, genreId, spotifyId, imageUrl], (err, result) => {
                  con.end((endErr) => {
                    if (endErr) console.error('Error closing connection:', endErr);
                    else console.log('Connection closed gracefully.');
                  });

                  if (err) {
                    return reject(err);
                  }
                  console.log("Track added successfully:", songTitle);
                  resolve(result);
                });
            });
          }
        });
      }
    });
  });
}

module.exports = { addTrack };
