// Helper function to execute database queries
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const con = require('./connection')();
    con.connect(err => {
      if (err) return reject(err);
      con.query(sql, params, (err, rows) => {
        con.end();
        if (err) return reject(err);
        resolve(rows);
      });
    });
  });
}

module.exports = { query };
