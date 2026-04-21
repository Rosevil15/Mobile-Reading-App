import { Platform } from 'react-native'

// Requirements: 7.2
const DATABASE_NAME = 'reading_app.db'

// Web doesn't support native SQLite — use a no-op stub so the app loads.
// On web, all data flows through Supabase directly.
const webStub = {
  execSync: () => {},
  runSync: () => ({ lastInsertRowId: 0, changes: 0 }),
  getAllSync: () => [],
  getFirstSync: () => null,
} as any

let db: any = null

/**
 * Returns the initialized SQLite database instance.
 * On web, returns a no-op stub (data is handled by Supabase).
 * Requirements: 7.2
 */
export function getDatabase(): any {
  if (db) return db

  if (Platform.OS === 'web') {
    db = webStub
    return db
  }

  // Native only
  const SQLite = require('expo-sqlite')
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
