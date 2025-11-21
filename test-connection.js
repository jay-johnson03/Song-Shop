require('dotenv').config();
const mysql = require('mysql');

console.log('Testing database connection...');
console.log('Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const con = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'SongShop',
  port: parseInt(process.env.DB_PORT) || 3306,
});

con.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected successfully!');
  
  con.query('SELECT COUNT(*) as count FROM Song', (err, results) => {
    if (err) {
      console.error('❌ Query failed:', err);
    } else {
      console.log('✅ Query successful:', results);
    }
    con.end();
    process.exit(0);
  });
});
