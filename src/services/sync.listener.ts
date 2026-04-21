import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { SyncService } from './sync.service'

/**
 * SyncListener subscribes to network state changes and triggers SyncService.sync()
 * when the device transitions from offline to online.
 * Requirements: 7.3, 8.1
 */

/**
 * Starts a network state listener that triggers sync on offline→online transition.
 * Tracks previous connection state to avoid triggering on every online event.
 *
 * @param syncService - Optional SyncService instance (defaults to a new one)
 * @returns An unsubscribe function to stop listening
 */
export function startSyncListener(syncService: SyncService = new SyncService()): () => void {
  let previouslyConnected: boolean | null = null

  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isConnected = state.isConnected === true

    // Only trigger sync on offline→online transition
    if (previouslyConnected === false && isConnected) {
      syncService.sync().catch(() => {
        // Errors are handled internally by SyncService; swallow here to avoid unhandled rejections
      })
    }

    previouslyConnected = isConnected
  })

  return unsubscribe
}
