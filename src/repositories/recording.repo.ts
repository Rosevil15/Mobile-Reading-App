import { getDatabase } from '../db/schema'
import { RecordingEntry } from '../types'

// Row shape returned by SQLite (snake_case)
interface RecordingRow {
  id: string
  progress_record_id: string
  local_uri: string
  remote_url: string | null
  synced: number
}

function rowToRecording(row: RecordingRow): RecordingEntry {
  return {
    id: row.id,
    progressRecordId: row.progress_record_id,
    localUri: row.local_uri,
    remoteUrl: row.remote_url ?? undefined,
    synced: row.synced === 1,
  }
}

/**
 * Repository for recordings table.
 * Requirements: 4.2, 4.6
 */
export class RecordingRepo {
  /**
   * Inserts a recording entry into the local DB.
   * Requirements: 4.2
   */
  async save(recording: RecordingEntry): Promise<void> {
    const db = getDatabase()
    db.runSync(
      `INSERT INTO recordings
        (id, progress_record_id, local_uri, remote_url, synced)
       VALUES (?, ?, ?, ?, ?)`,
      recording.id,
      recording.progressRecordId,
      recording.localUri,
      recording.remoteUrl ?? null,
      recording.synced ? 1 : 0
    )
  }

  /**
   * Returns all recordings that have not yet been synced.
   * Requirements: 4.6
   */
  async getUnsynced(): Promise<RecordingEntry[]> {
    const db = getDatabase()
    const rows = db.getAllSync<RecordingRow>(
      `SELECT id, progress_record_id, local_uri, remote_url, synced
       FROM recordings
       WHERE synced = 0`
    )
    return rows.map(rowToRecording)
  }

  /**
   * Marks a recording as synced and stores the remote URL.
   * Requirements: 4.6
   */
  async markSynced(id: string, remoteUrl: string): Promise<void> {
    const db = getDatabase()
    db.runSync(
      'UPDATE recordings SET synced = 1, remote_url = ? WHERE id = ?',
      remoteUrl,
      id
    )
  }
}
