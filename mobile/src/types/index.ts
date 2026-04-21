// Core domain types for the Mobile Reading App

export type ReadingLevel = 'beginner' | 'intermediate' | 'advanced';

export type PaceAssessment = 'too_slow' | 'appropriate' | 'too_fast';

export interface ReadingMaterial {
  id: string;
  title: string;
  text: string;
  level: ReadingLevel;
  defaultTTSRate: number;
  language: string;
  bundled: boolean;
  downloadedAt?: string; // ISO timestamp
}

export interface MispronunciationDetail {
  word: string;
  expected: string;
  actual: string;
  offsetMs: number;
}

export interface AnalysisResult {
  mispronounced: MispronunciationDetail[];
  pace: PaceAssessment;
  accuracyScore: number;   // 0–100
  wordAccuracy: number;    // 0–100
  fluencyScore: number;    // 0–100
}

export interface FeedbackReport {
  mispronounced: MispronunciationDetail[];
  pace: PaceAssessment;
  accuracyScore: number;
  suggestions: string[];   // at least 1 item always
  generatedAt: string;     // ISO timestamp
}

export interface ProgressRecord {
  id: string;
  userId: string;
  materialId: string;
  sessionScore: number;    // 0–100 composite
  accuracyScore: number;
  fluencyScore: number;
  pace: PaceAssessment;
  feedbackSummary: string;
  recordingUri: string;    // local path or remote URL after sync
  completedAt: string;     // ISO timestamp
  synced: boolean;
  syncedAt?: string;
}

export interface LocalSession {
  id: string;
  userId: string;
  isGuest: boolean;
  createdAt: string;
}

export interface RecordingResult {
  uri: string;
  durationMs: number;
  sampleRate: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface SyncResult {
  uploaded: number;
  failed: number;
  errors: SyncError[];
}

export interface SyncError {
  recordId: string;
  message: string;
}

export interface TTSOptions {
  rate: number;
  language: string;
}
