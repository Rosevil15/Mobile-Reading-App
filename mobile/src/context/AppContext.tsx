import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LocalSession } from '../types';
import networkMonitor from '../services/NetworkMonitor';
import localStorageService from '../services/LocalStorageService';

interface AppContextValue {
  isOnline: boolean;
  isLoading: boolean;
  session: LocalSession | null;
  setSession: (session: LocalSession | null) => void;
  showOfflineWarning: boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      // Check connectivity and load session in parallel
      const [online, savedSession] = await Promise.all([
        networkMonitor.isOnline(),
        localStorageService.getSession(),
      ]);

      if (cancelled) return;

      setIsOnline(online);
      setSession(savedSession);

      // If offline and no materials in LocalStorage, show warning
      if (!online) {
        const materials = await localStorageService.getMaterials();
        if (!cancelled && materials.length === 0) {
          setShowOfflineWarning(true);
        }
      }

      setIsLoading(false);
    }

    initialize();

    // Subscribe to connectivity changes
    const unsubscribe = networkMonitor.subscribe((online) => {
      if (!cancelled) {
        setIsOnline(online);
        // Clear warning once we come back online
        if (online) {
          setShowOfflineWarning(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <AppContext.Provider value={{ isOnline, isLoading, session, setSession, showOfflineWarning }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}
