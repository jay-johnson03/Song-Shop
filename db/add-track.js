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
      const genreQuery = `INSERT INTO Genre (genreName) VALUES (?) 
                          ON DUPLICATE KEY UPDATE genreId=LAST_INSERT_ID(genreId)`;
      
      con.query(genreQuery, [genreName], (err, result) => {
        if (err) {
          con.end();
          return reject(err);
        }
        const genreId = result.insertId;

        // 2. Insert or get Artist
        const artistQuery = `INSERT INTO Artist (artistName, genreId) VALUES (?, ?) 
                             ON DUPLICATE KEY UPDATE artistId=LAST_INSERT_ID(artistId)`;
        
        con.query(artistQuery, [artistName, genreId], (err, result) => {
          if (err) {
            con.end();
            return reject(err);
          }
          const artistId = result.insertId;

          // 3. Insert Song
          const songQuery = `INSERT INTO Song (songTitle, artistId, genreId, spotifyId, imageUrl, previewUrl) 
                             VALUES (?, ?, ?, ?, ?, ?) 
                             ON DUPLICATE KEY UPDATE 
                             songTitle = VALUES(songTitle),
                             imageUrl = VALUES(imageUrl),
                             previewUrl = VALUES(previewUrl)`;
          
          con.query(songQuery, [songTitle, artistId, genreId, spotifyId, imageUrl, previewUrl], (err, result) => {
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
      });
    });
  });
}

module.exports = { addTrack };
