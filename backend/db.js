const Database = require('better-sqlite3');
const path = require('path');

// This creates the database FILE on disk (acre.db) the first time it runs.
// On every subsequent run, it just opens the existing file.
const db = new Database(path.join(__dirname, 'acre.db'));

// WAL mode = Write-Ahead Logging.
// Makes SQLite faster and safer for concurrent reads/writes.
db.pragma('journal_mode = WAL');

// Create the users table if it doesn't exist yet.
// This runs every time the server starts — but IF NOT EXISTS means it's safe to run repeatedly.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL UNIQUE,
    password  TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  )
`);

console.log('📦 SQLite database ready (acre.db)');

// Export db so server.js can use it to INSERT and SELECT users
module.exports = db;
