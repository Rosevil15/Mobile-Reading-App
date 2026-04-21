import { getDatabase } from '../db/schema'
import { ReadingMaterial, DifficultyLevel } from '../types'

// Row shape returned by SQLite (snake_case)
interface ReadingMaterialRow {
  id: string
  title: string
  content: string
  difficulty_level: string
  cached_at: number
}

function rowToMaterial(row: ReadingMaterialRow): ReadingMaterial {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    difficultyLevel: row.difficulty_level as DifficultyLevel,
  }
}

/**
 * Repository for reading_materials table.
 * Requirements: 2.1, 2.3, 2.5
 */
export class ReadingMaterialRepo {
  /**
   * Returns all reading materials stored in the local DB.
   * Requirements: 2.1, 2.3
   */
  async getAll(): Promise<ReadingMaterial[]> {
    const db = getDatabase()
    const rows = db.getAllSync<ReadingMaterialRow>(
      'SELECT id, title, content, difficulty_level, cached_at FROM reading_materials'
    )
    return rows.map(rowToMaterial)
  }

  /**
   * Inserts or replaces a reading material in the local DB.
   * Requirements: 2.5
   */
  async upsert(material: ReadingMaterial): Promise<void> {
    const db = getDatabase()
    const cachedAt = Date.now()
    db.runSync(
      'INSERT OR REPLACE INTO reading_materials (id, title, content, difficulty_level, cached_at) VALUES (?, ?, ?, ?, ?)',
      material.id,
      material.title,
      material.content,
      material.difficultyLevel,
      cachedAt
    )
  }
}
