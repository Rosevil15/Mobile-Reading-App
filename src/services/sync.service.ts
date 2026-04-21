import { supabase } from './supabase'
import { ProgressRepo } from '../repositories/progress.repo'
import { RecordingRepo } from '../repositories/recording.repo'
import { SyncResult, SyncError } from '../types'

/**
 * SyncService uploads unsynced local recordings and progress records to Supabase.
 * Runs in the background without blocking the UI.
 * Requirements: 4.6, 5.4, 7.3, 7.5, 8.1, 8.2, 8.3, 8.4
 */
export class SyncService {
  private progressRepo: ProgressRepo
  private recordingRepo: RecordingRepo

  constructor(
    progressRepo: ProgressRepo = new ProgressRepo(),
    recordingRepo: RecordingRepo = new RecordingRepo()
  ) {
    this.progressRepo = progressRepo
    this.recordingRepo = recordingRepo
  }

  /**
   * Syncs all unsynced recordings and progress records to Supabase.
   * - Uploads recording files to the 'recordings' storage bucket
   * - Inserts rows into the recordings and progress_records tables
   * - Handles 409 duplicates by marking the record synced locally
   * - On network error, retains local data (synced=false) and adds to errors
   * Requirements: 4.6, 5.4, 7.5, 8.1, 8.2, 8.3, 8.4
   */
  async sync(): Promise<SyncResult> {
    const errors: SyncError[] = []
    let uploadedRecordings = 0
    let uploadedProgressRecords = 0

    // --- Sync recordings ---
    let unsyncedRecordings = []
    try {
      unsyncedRecordings = await this.recordingRepo.getUnsynced()
    } catch (err) {
      errors.push({
        recordId: 'recordings-query',
        message: err instanceof Error ? err.message : String(err),
        retryable: true,
      })
    }

    for (const recording of unsyncedRecordings) {
      try {
        // Fetch the local file as a blob
        const response = await fetch(recording.localUri)
        const blob = await response.blob()

        const storagePath = `${recording.id}.m4a`

        // Upload to Supabase Storage bucket 'recordings'
        const { error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(storagePath, blob, { contentType: 'audio/m4a', upsert: false })

        if (uploadError) {
          // 409 duplicate — already uploaded, just mark synced locally
          if (this.isDuplicateError(uploadError)) {
            const { data: urlData } = supabase.storage
              .from('recordings')
              .getPublicUrl(storagePath)
            await this.recordingRepo.markSynced(recording.id, urlData.publicUrl)
            uploadedRecordings++
            continue
          }
          throw uploadError
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('recordings')
          .getPublicUrl(storagePath)
        const remoteUrl = urlData.publicUrl

        // Insert row into recordings table
        const { error: insertError } = await supabase
          .from('recordings')
          .insert({
            id: recording.id,
            progress_record_id: recording.progressRecordId,
            file_url: remoteUrl,
          })

        if (insertError) {
          if (this.isDuplicateError(insertError)) {
            await this.recordingRepo.markSynced(recording.id, remoteUrl)
            uploadedRecordings++
            continue
          }
          throw insertError
        }

        await this.recordingRepo.markSynced(recording.id, remoteUrl)
        uploadedRecordings++
      } catch (err) {
        errors.push({
          recordId: recording.id,
          message: err instanceof Error ? err.message : String(err),
          retryable: true,
        })
        // Keep synced=false so it retries next time (Requirements: 7.5)
      }
    }

    // --- Sync progress records ---
    let unsyncedProgress = []
    try {
      unsyncedProgress = await this.progressRepo.getUnsynced()
    } catch (err) {
      errors.push({
        recordId: 'progress-query',
        message: err instanceof Error ? err.message : String(err),
        retryable: true,
      })
    }

    for (const record of unsyncedProgress) {
      try {
        const { error: insertError } = await supabase
          .from('progress_records')
          .insert({
            id: record.id,
            student_id: record.studentId,
            material_id: record.materialId,
            material_title: record.materialTitle,
            score: record.score,
            fluency_rating: record.fluencyRating,
            words_per_minute: record.wordsPerMinute,
            session_date: record.sessionDate.toISOString(),
          })

        if (insertError) {
          // 409 duplicate — already uploaded, mark synced locally
          if (this.isDuplicateError(insertError)) {
            await this.progressRepo.markSynced(record.id)
            uploadedProgressRecords++
            continue
          }
          throw insertError
        }

        await this.progressRepo.markSynced(record.id)
        uploadedProgressRecords++
      } catch (err) {
        errors.push({
          recordId: record.id,
          message: err instanceof Error ? err.message : String(err),
          retryable: true,
        })
        // Keep synced=false so it retries next time (Requirements: 7.5)
      }
    }

    return { uploadedRecordings, uploadedProgressRecords, errors }
  }

  /**
   * Checks whether a Supabase error represents a duplicate/conflict (HTTP 409 or
   * Postgres unique-violation code 23505).
   */
  private isDuplicateError(error: { status?: number; code?: string; message?: string }): boolean {
    return (
      error.status === 409 ||
      error.code === '23505' ||
      (typeof error.message === 'string' && error.message.includes('duplicate'))
    )
  }
}
