import { useState, useEffect } from 'react';
import networkMonitor from '../services/NetworkMonitor';

interface ConnectivityState {
  isOnline: boolean;
  isLoading: boolean;
}

/**
 * Hook that checks connectivity on mount and subscribes to changes.
 * Returns { isOnline, isLoading }.
 */
export function useConnectivity(): ConnectivityState {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Check current connectivity on mount
    networkMonitor.isOnline().then((online) => {
      if (!cancelled) {
        setIsOnline(online);
        setIsLoading(false);
      }
    });

    // Subscribe to future changes
    const unsubscribe = networkMonitor.subscribe((online) => {
      if (!cancelled) {
        setIsOnline(online);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { isOnline, isLoading };
}
