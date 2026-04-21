import { Platform } from 'react-native';
import { ProgressRecord, ReadingMaterial, LocalSession } from '../types';

// ─── In-memory / localStorage fallback for web ───────────────────────────────
class WebStorageService {
  private get<T>(key: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  }
  private set(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async init() {}

  async saveProgressRecord(record: ProgressRecord) {
    const records = this.get<ProgressRecord>('progress_records');
    const idx = records.findIndex(r => r.id === record.id);
    if (idx >= 0) records[idx] = record; else records.push(record);
    this.set('progress_records', records);
  }
  async getProgressRecords(userId: string): Promise<ProgressRecord[]> {
    return this.get<ProgressRecord>('progress_records').filter(r => r.userId === userId);
  }
  async markSynced(recordId: string) {
    const records = this.get<ProgressRecord>('progress_records').map(r =>
      r.id === recordId ? { ...r, synced: true, syncedAt: new Date().toISOString() } : r
    );
    this.set('progress_records', records);
  }
  async getUnsynced(): Promise<ProgressRecord[]> {
    return this.get<ProgressRecord>('progress_records').filter(r => !r.synced);
  }
  async saveMaterial(material: ReadingMaterial) {
    const materials = this.get<ReadingMaterial>('reading_materials');
    const idx = materials.findIndex(m => m.id === material.id);
    if (idx >= 0) materials[idx] = material; else materials.push(material);
    this.set('reading_materials', materials);
  }
  async getMaterials(): Promise<ReadingMaterial[]> {
    return this.get<ReadingMaterial>('reading_materials');
  }
  async saveSession(session: LocalSession) {
    this.set('local_session', session);
  }
  async getSession(): Promise<LocalSession | null> {
    try {
      const s = localStorage.getItem('local_session');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
}

// ─── SQLite implementation for native ────────────────────────────────────────
class NativeStorageService {
  private db: any = null;

  async init(): Promise<void> {
    const SQLite = await import('expo-sqlite');
    this.db = await SQLite.openDatabaseAsync('reading_app.db');
    await this.createTables();
  }

  private async getDb(): Promise<any> {
    if (!this.db) await this.init();
    return this.db;
  }

  private async createTables(): Promise<void> {
    const db = await this.getDb();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS reading_materials (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, text TEXT NOT NULL,
        level TEXT NOT NULL, default_tts_rate REAL NOT NULL,
        language TEXT NOT NULL, bundled INTEGER NOT NULL DEFAULT 0, downloaded_at TEXT
      );
      CREATE TABLE IF NOT EXISTS progress_records (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, material_id TEXT NOT NULL,
        session_score REAL NOT NULL, accuracy_score REAL NOT NULL, fluency_score REAL NOT NULL,
        pace TEXT NOT NULL, feedback_summary TEXT NOT NULL, recording_uri TEXT NOT NULL,
        completed_at TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0, synced_at TEXT
      );
      CREATE TABLE IF NOT EXISTS local_sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        is_guest INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
    `);
  }

  async saveProgressRecord(record: ProgressRecord): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO progress_records
        (id, user_id, material_id, session_score, accuracy_score, fluency_score,
         pace, feedback_summary, recording_uri, completed_at, synced, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.userId, record.materialId, record.sessionScore,
       record.accuracyScore, record.fluencyScore, record.pace, record.feedbackSummary,
       record.recordingUri, record.completedAt, record.synced ? 1 : 0, record.syncedAt ?? null]
    );
  }

  async getProgressRecords(userId: string): Promise<ProgressRecord[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM progress_records WHERE user_id = ? ORDER BY completed_at DESC', [userId]
    );
    return rows.map(this.rowToProgressRecord);
  }

  async markSynced(recordId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'UPDATE progress_records SET synced = 1, synced_at = ? WHERE id = ?',
      [new Date().toISOString(), recordId]
    );
  }

  async getUnsynced(): Promise<ProgressRecord[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM progress_records WHERE synced = 0 ORDER BY completed_at ASC'
    );
    return rows.map(this.rowToProgressRecord);
  }

  async saveMaterial(material: ReadingMaterial): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO reading_materials
        (id, title, text, level, default_tts_rate, language, bundled, downloaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [material.id, material.title, material.text, material.level,
       material.defaultTTSRate, material.language, material.bundled ? 1 : 0,
       material.downloadedAt ?? null]
    );
  }

  async getMaterials(): Promise<ReadingMaterial[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM reading_materials ORDER BY title ASC');
    return rows.map(this.rowToReadingMaterial);
  }

  async saveSession(session: LocalSession): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM local_sessions');
    await db.runAsync(
      'INSERT INTO local_sessions (id, user_id, is_guest, created_at) VALUES (?, ?, ?, ?)',
      [session.id, session.userId, session.isGuest ? 1 : 0, session.createdAt]
    );
  }

  async getSession(): Promise<LocalSession | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<any>('SELECT * FROM local_sessions LIMIT 1');
    if (!row) return null;
    return { id: row.id, userId: row.user_id, isGuest: row.is_guest === 1, createdAt: row.created_at };
  }

  private rowToProgressRecord(row: any): ProgressRecord {
    return {
      id: row.id, userId: row.user_id, materialId: row.material_id,
      sessionScore: row.session_score, accuracyScore: row.accuracy_score,
      fluencyScore: row.fluency_score, pace: row.pace,
      feedbackSummary: row.feedback_summary, recordingUri: row.recording_uri,
      completedAt: row.completed_at, synced: row.synced === 1,
      syncedAt: row.synced_at ?? undefined,
    };
  }

  private rowToReadingMaterial(row: any): ReadingMaterial {
    return {
      id: row.id, title: row.title, text: row.text, level: row.level,
      defaultTTSRate: row.default_tts_rate, language: row.language,
      bundled: row.bundled === 1, downloadedAt: row.downloaded_at ?? undefined,
    };
  }
}

const localStorageService = Platform.OS === 'web'
  ? new WebStorageService()
  : new NativeStorageService();

export default localStorageService;
export { localStorageService };
