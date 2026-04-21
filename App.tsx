import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { startSyncListener } from './src/services/sync.listener';
import { RootNavigator } from './src/navigation/RootNavigator';

// Requirements: 7.3, 8.1, 8.4
export default function App() {
  useEffect(() => {
    const unsubscribe = startSyncListener();
    return unsubscribe;
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}
