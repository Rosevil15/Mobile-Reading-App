import { AppState, AppStateStatus } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { SyncResult, SyncError } from '../types';
import localStorageService from './LocalStorageService';
import networkMonitor from './NetworkMonitor';
import authService from './AuthService';

const MAX_RETRIES = 4;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30000;

function backoffDelay(attempt: number): number {
  // attempt 0 → 1s, 1 → 2s, 2 → 4s, 3+ → capped at 30s
  return Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class SyncService {
  private networkUnsubscribe: (() => void) | null = null;
  private appStateSubscription: { remove: () => void } | null = null;

  /**
   * Start the SyncService.
   * Subscribes to network connectivity changes and app foreground events.
   * Triggers syncNow() whenever the device comes online or the app enters foreground.
   * Requirements: 7.3
   */
  start(): void {
    // Subscribe to network connectivity changes
    this.networkUnsubscribe = networkMonitor.subscribe((isOnline: boolean) => {
      if (isOnline) {
        this.syncNow().catch(() => {
          // Errors are captured in SyncResult; swallow here to avoid unhandled rejections
        });
      }
    });

    // Subscribe to AppState changes — trigger sync when app comes to foreground
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          this.syncNow().catch(() => {
            // Swallow — errors are captured in SyncResult
          });
        }
      }
    );
  }

  /**
   * Stop the SyncService and unsubscribe from all listeners.
   * Requirements: 7.3
   */
  stop(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * Upload all unsynced ProgressRecords to the server.
   * On success: marks each record as synced in LocalStorage.
   * On failure: retains records in LocalStorage and retries with exponential backoff.
   * Requirements: 7.3, 7.4, 7.5
   */
  async syncNow(): Promise<SyncResult> {
    const unsynced = await localStorageService.getUnsynced();

    if (unsynced.length === 0) {
      return { uploaded: 0, failed: 0, errors: [] };
    }

    const token = await authService.getToken();
    let uploaded = 0;
    let failed = 0;
    const errors: SyncError[] = [];

    for (const record of unsynced) {
      let success = false;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await sleep(backoffDelay(attempt - 1));
        }

        try {
          await axios.post(
            `${BASE_URL}/progress`,
            { records: [record] },
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          await localStorageService.markSynced(record.id);
          uploaded++;
          success = true;
          break;
        } catch (err: any) {
          if (attempt === MAX_RETRIES) {
            // All retries exhausted — retain record in LocalStorage (do not delete)
            const message =
              err?.response?.data?.message ||
              err?.message ||
              'Unknown error';
            errors.push({ recordId: record.id, message });
            failed++;
          }
          // Otherwise continue to next retry attempt
        }
      }

      // success is tracked above; record stays in LocalStorage if !success
      void success; // suppress unused variable warning
    }

    return { uploaded, failed, errors };
  }
}

export const syncService = new SyncService();
export default syncService;
