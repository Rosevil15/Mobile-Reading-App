import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { startSyncListener } from './src/services/sync.listener';
import { RootNavigator } from './src/navigation/RootNavigator';

// App version: 2.0.0
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
