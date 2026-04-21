/**
 * User role in the application.
 * Requirements: 1.1, 6.1
 */
export type Role = 'student' | 'teacher'

/**
 * Difficulty level for reading materials.
 * Requirements: 2.4
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

/**
 * A reading passage available for students to practice.
 * Requirements: 2.4
 */
export interface ReadingMaterial {
  id: string
  title: string
  content: string
  difficultyLevel: DifficultyLevel
}

/**
 * A record of a student's completed reading session.
 * Requirements: 5.5
 */
export interface ProgressRecord {
  id: string
  studentId: string
  materialId: string
  materialTitle: string
  score: number           // 0–100
  fluencyRating: string
  wordsPerMinute: number
  sessionDate: Date
  synced: boolean
}

/**
 * An audio recording captured during a reading session.
 * Requirements: 4.3
 */
export interface RecordingEntry {
  id: string
  progressRecordId: string
  localUri: string
  remoteUrl?: string
  synced: boolean
}

/**
 * An authenticated user session.
 * Requirements: 1.2, 1.4
 */
export interface Session {
  userId: string
  email: string
  role: Role
  accessToken: string
  refreshToken: string
}

/**
 * Result returned by a sync operation.
 * Requirements: 8.1
 */
export interface SyncResult {
  uploadedRecordings: number
  uploadedProgressRecords: number
  errors: SyncError[]
}

/**
 * An error that occurred during a sync operation.
 * Requirements: 7.5
 */
export interface SyncError {
  recordId: string
  message: string
  retryable: boolean
}
