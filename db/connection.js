require("dotenv").config();
const mysql = require("mysql");

function newConnection() {
  let con = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'SongShop',
    port: parseInt(process.env.DB_PORT) || 3306,
    charset: 'utf8mb4',
    multipleStatements: true
  });
  
  return con;
}

module.exports = newConnection;
