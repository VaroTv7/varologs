import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'varologs.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  -- Users (no password, just name)
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    avatar_color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Media items (shared master record)
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('movie', 'series', 'game', 'book', 'anime', 'manga', 'music', 'podcast')),
    title TEXT NOT NULL,
    year INTEGER,
    creator TEXT,
    genre TEXT,
    synopsis TEXT,
    cover_url TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, title, year)
  );

  -- User reviews per item
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating REAL CHECK(rating >= 0 AND rating <= 10),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'abandoned')),
    review_text TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, user_id)
  );

  -- Custom lists
  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- List items
  CREATE TABLE IF NOT EXISTS list_items (
    list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(list_id, item_id)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
  CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_lists_user ON lists(user_id);
`);

// Migration: Add new fields if they don't exist (Simple check)
const columns = db.prepare('PRAGMA table_info(items)').all();
const columnNames = columns.map(c => c.name);

const newColumns = [
  { name: 'platform', type: 'TEXT' },
  { name: 'developer', type: 'TEXT' },
  { name: 'publisher', type: 'TEXT' },
  { name: 'duration_min', type: 'INTEGER' }, // Movies, episodes
  { name: 'pages', type: 'INTEGER' }, // Books
  { name: 'episodes', type: 'INTEGER' }, // Series, anime
  { name: 'seasons', type: 'INTEGER' }, // Series
  { name: 'isbn', type: 'TEXT' }, // Books
  { name: 'metadata', type: 'TEXT' }, // JSON for extras
  { name: 'status', type: 'TEXT' } // Item status (running, ended, etc)
];

newColumns.forEach(col => {
  if (!columnNames.includes(col.name)) {
    console.log(`Migrating: Adding ${col.name} to items table...`);
    try {
      db.exec(`ALTER TABLE items ADD COLUMN ${col.name} ${col.type}`);
    } catch (err) {
      console.error(`Error adding column ${col.name}:`, err.message);
    }
  }
});

console.log('Database initialized at:', dbPath);

export default db;
