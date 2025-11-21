require('dotenv').config();
const mysql = require('mysql');

function newConnection() {
  let con = mysql.createConnection({
    host: process.env.HOST || 'localhost',
    user: process.env.USER || 'root',
    password: process.env.PASS || '',
    database: process.env.DB || 'songshop',
    port: process.env.PORT || 3306,
    charset: 'utf8mb4',
    multipleStatements: true
  });
  return con;
}

module.exports = newConnection;