import { getDatabase } from '../db/schema'
import { ProgressRecord } from '../types'

// Row shape returned by SQLite (snake_case, Unix timestamps)
interface ProgressRecordRow {
  id: string
  student_id: string
  material_id: string
  material_title: string
  score: number
  fluency_rating: string
  words_per_minute: number
  session_date: number
  synced: number
}

function rowToRecord(row: ProgressRecordRow): ProgressRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    materialId: row.material_id,
    materialTitle: row.material_title,
    score: row.score,
    fluencyRating: row.fluency_rating,
    wordsPerMinute: row.words_per_minute,
    sessionDate: new Date(row.session_date),
    synced: row.synced === 1,
  }
}

/**
 * Repository for progress_records table.
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export class ProgressRepo {
  /**
   * Inserts a progress record into the local DB.
   * Requirements: 5.1
   */
  async save(record: ProgressRecord): Promise<void> {
    const db = getDatabase()
    db.runSync(
      `INSERT INTO progress_records
        (id, student_id, material_id, material_title, score, fluency_rating, words_per_minute, session_date, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.studentId,
      record.materialId,
      record.materialTitle,
      record.score,
      record.fluencyRating,
      record.wordsPerMinute,
      record.sessionDate.getTime(),
      record.synced ? 1 : 0
    )
  }

  /**
   * Returns all progress records for a student, ordered by sessionDate descending.
   * Requirements: 5.2, 5.3
   */
  async getByStudent(studentId: string): Promise<ProgressRecord[]> {
    const db = getDatabase()
    const rows = db.getAllSync<ProgressRecordRow>(
      `SELECT id, student_id, material_id, material_title, score, fluency_rating, words_per_minute, session_date, synced
       FROM progress_records
       WHERE student_id = ?
       ORDER BY session_date DESC`,
      studentId
    )
    return rows.map(rowToRecord)
  }

  /**
   * Returns all progress records that have not yet been synced.
   * Requirements: 5.4
   */
  async getUnsynced(): Promise<ProgressRecord[]> {
    const db = getDatabase()
    const rows = db.getAllSync<ProgressRecordRow>(
      `SELECT id, student_id, material_id, material_title, score, fluency_rating, words_per_minute, session_date, synced
       FROM progress_records
       WHERE synced = 0`
    )
    return rows.map(rowToRecord)
  }

  /**
   * Marks a progress record as synced.
   * Requirements: 5.4
   */
  async markSynced(id: string): Promise<void> {
    const db = getDatabase()
    db.runSync(
      'UPDATE progress_records SET synced = 1 WHERE id = ?',
      id
    )
  }
}
