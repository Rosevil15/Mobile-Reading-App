import * as SQLite from 'expo-sqlite'

// Requirements: 7.2
const DATABASE_NAME = 'reading_app.db'

let db: SQLite.SQLiteDatabase | null = null

/**
 * Returns the initialized SQLite database instance, creating it if needed.
 * All three tables are created on first open.
 * Requirements: 7.2
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (db) return db

  db = SQLite.openDatabaseSync(DATABASE_NAME)

  db.execSync(`
    CREATE TABLE IF NOT EXISTS reading_materials (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      difficulty_level TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progress_records (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      material_title TEXT NOT NULL,
      score INTEGER NOT NULL,
      fluency_rating TEXT NOT NULL,
      words_per_minute INTEGER NOT NULL,
      session_date INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      progress_record_id TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      remote_url TEXT,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `)

  return db
}
