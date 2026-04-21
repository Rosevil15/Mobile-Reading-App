// Polyfill for crypto.getRandomValues() — must be first import
import 'react-native-get-random-values';

/**
 * App.tsx
 *
 * Entry point for the Mobile Reading App.
 *
 * Task 18.1 — React Navigation stack (Login → MaterialList → ReadingSession → Feedback,
 *              TeacherDashboard accessible for teacher/admin users)
 * Task 18.2 — Start SyncService when session is established; stop on logout
 * Task 18.3 — Show offline banner / offline warning screen via NetworkMonitor
 * Task 18.4 — Seed bundled materials on first launch if LocalStorage is empty
 *
 * Requirements: 1.2, 1.3, 2.1, 3.2, 3.3, 7.3, 8.3
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import { AppProvider, useAppContext } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import syncService from './src/services/SyncService';
import localStorageService from './src/services/LocalStorageService';
import { ReadingMaterial } from './src/types';

// ─── Bundled materials (matches backend ReadingMaterialSeeder) ────────────────
// Requirements: 3.2
const BUNDLED_MATERIALS: ReadingMaterial[] = [
  {
    id: 'bundled-little-red-hen',
    title: 'The Little Red Hen',
    text: 'Once upon a time, there was a little red hen who lived on a farm. She found some wheat seeds and decided to plant them. She asked her friends for help, but no one wanted to help her. So she planted the seeds herself. When the wheat grew tall, she asked for help to cut it. Again, no one helped. She cut it herself. She ground the wheat into flour and baked a loaf of bread. When the bread was ready, everyone wanted to eat it. But the little red hen said she would eat it herself, because she had done all the work.',
    level: 'beginner',
    defaultTTSRate: 0.75,
    language: 'en',
    bundled: true,
  },
  {
    id: 'bundled-water-cycle',
    title: 'The Water Cycle',
    text: 'Water is constantly moving around the Earth in a process called the water cycle. The sun heats water in oceans, lakes, and rivers, causing it to evaporate and rise into the atmosphere as water vapor. As the vapor rises, it cools and condenses into tiny water droplets, forming clouds. When enough droplets collect, they fall back to Earth as precipitation — rain, snow, sleet, or hail. This water flows into rivers and streams, soaks into the ground, or collects in lakes and oceans, where the cycle begins again.',
    level: 'intermediate',
    defaultTTSRate: 1.0,
    language: 'en',
    bundled: true,
  },
  {
    id: 'bundled-theory-of-relativity',
    title: 'The Theory of Relativity',
    text: "Albert Einstein's theory of relativity, published in two parts in 1905 and 1915, fundamentally changed our understanding of space, time, and gravity. The special theory of relativity introduced the concept that the laws of physics are the same for all observers moving at constant velocities, and that the speed of light in a vacuum is constant regardless of the motion of the source or observer. One of its most famous consequences is the equivalence of mass and energy, expressed in the equation E equals mc squared. The general theory of relativity extended these ideas to include acceleration and gravity, describing gravity not as a force but as a curvature of spacetime caused by mass and energy.",
    level: 'advanced',
    defaultTTSRate: 1.25,
    language: 'en',
    bundled: true,
  },
];

// ─── Inner component — has access to AppContext ───────────────────────────────
function AppShell() {
  const { isLoading, isOnline, session, showOfflineWarning } = useAppContext();
  const prevSessionRef = useRef<typeof session>(null);

  // Task 18.2 — Start/stop SyncService based on session state
  // Requirements: 7.3
  useEffect(() => {
    const hadSession = prevSessionRef.current !== null;
    const hasSession = session !== null;

    if (!hadSession && hasSession) {
      syncService.start();
    } else if (hadSession && !hasSession) {
      syncService.stop();
    }

    prevSessionRef.current = session;
  }, [session]);

  // Task 18.4 — Seed bundled materials on first launch
  // Requirements: 3.2
  useEffect(() => {
    async function seedIfEmpty() {
      try {
        const existing = await localStorageService.getMaterials();
        if (existing.length === 0) {
          for (const material of BUNDLED_MATERIALS) {
            await localStorageService.saveMaterial(material);
          }
        }
      } catch {
        // Non-fatal — app still works; materials will be empty until next launch
      }
    }
    seedIfEmpty();
  }, []);

  // Show a loading spinner while AppContext initialises
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" testID="app-loading" />
      </View>
    );
  }

  // Task 18.3 — Full-screen offline warning when no materials are available
  // Requirements: 1.3, 1.4
  if (showOfflineWarning) {
    return (
      <View style={styles.centered} testID="offline-warning-screen">
        <Text style={styles.offlineWarningTitle}>No Content Available</Text>
        <Text style={styles.offlineWarningBody}>
          You are offline and no materials have been downloaded yet.{'\n'}
          Please connect to the internet to download content before using the app offline.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      {/* Task 18.3 — Offline banner */}
      {/* Requirements: 1.2, 1.3 */}
      {!isOnline && (
        <View style={styles.offlineBanner} testID="offline-banner">
          <Text style={styles.offlineBannerText}>You are offline</Text>
        </View>
      )}

      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaView>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  offlineBanner: {
    backgroundColor: '#e53e3e',
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  offlineWarningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  offlineWarningBody: {
    fontSize: 15,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 24,
  },
});
