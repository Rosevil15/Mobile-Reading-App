/**
 * FeedbackScreen
 *
 * Receives { recordingUri, material } from navigation params.
 * On mount: calls VoiceAnalyzerClient.analyze(), then FeedbackEngine.generate().
 * Shows a loading state while analyzing.
 * Displays: mispronounced words, pace assessment, accuracy score, suggestions.
 * On failure: shows a descriptive error and a "Try Again" button that
 * re-submits the same recording without requiring a new one.
 *
 * Requirements: 6.3, 6.4, 7.1, 9.1, 9.2
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import feedbackEngine from '../services/FeedbackEngine';
import localStorageService from '../services/LocalStorageService';
import voiceAnalyzerClient from '../services/VoiceAnalyzerClient';
import { useAppContext } from '../context/AppContext';
import { AnalysisResult, FeedbackReport, ReadingMaterial } from '../types';

// ─── Navigation prop shape ───────────────────────────────────────────────────
interface Props {
  navigation?: { goBack: () => void };
  route?: { params?: { recordingUri?: string; material?: ReadingMaterial } };
  // Allow direct prop injection for tests
  recordingUri?: string;
  material?: ReadingMaterial;
}

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; report: FeedbackReport };

const PACE_LABELS: Record<string, string> = {
  too_slow: 'Too slow',
  appropriate: 'Appropriate',
  too_fast: 'Too fast',
};

export default function FeedbackScreen({ navigation, route, recordingUri: propUri, material: propMaterial }: Props) {
  const recordingUri = propUri ?? route?.params?.recordingUri ?? '';
  const material: ReadingMaterial | undefined = propMaterial ?? route?.params?.material;

  const { session } = useAppContext();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const runAnalysis = useCallback(async () => {
    if (!recordingUri || !material) {
      setState({ status: 'error', message: 'Missing recording or material. Please go back and try again.' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const analysisResult: AnalysisResult = await voiceAnalyzerClient.analyze(recordingUri, material.id);
      const report = feedbackEngine.generate(analysisResult, material);

      // Save ProgressRecord to LocalStorage (Requirements 7.1, 9.1, 9.2)
      // Each call uses a fresh uuid so repeated sessions are appended, never overwritten
      const record = {
        id: uuidv4(),
        userId: session?.userId ?? 'guest',
        materialId: material.id,
        sessionScore: report.accuracyScore,
        accuracyScore: analysisResult.accuracyScore,
        fluencyScore: analysisResult.fluencyScore,
        pace: analysisResult.pace,
        feedbackSummary: report.suggestions.join('. '),
        recordingUri,
        completedAt: new Date().toISOString(),
        synced: false,
      };
      await localStorageService.saveProgressRecord(record);

      setState({ status: 'ready', report });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Voice analysis failed. Please try again.';
      setState({ status: 'error', message });
    }
  }, [recordingUri, material, session]);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <View style={styles.centered} testID="loading-container">
        <ActivityIndicator size="large" color="#4A90E2" testID="loading-indicator" />
        <Text style={styles.loadingText}>Analyzing your reading...</Text>
      </View>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <View style={styles.centered} testID="error-container">
        <Text style={styles.errorTitle}>Analysis Failed</Text>
        <Text style={styles.errorMessage} testID="error-message">
          {state.message}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={runAnalysis}
          testID="try-again-button"
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Ready ─────────────────────────────────────────────────────────────────
  const { report } = state;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="feedback-scroll">
      <Text style={styles.heading}>Your Feedback</Text>

      {/* Accuracy score */}
      <View style={styles.card} testID="accuracy-card">
        <Text style={styles.cardLabel}>Accuracy Score</Text>
        <Text style={styles.scoreValue} testID="accuracy-score">
          {report.accuracyScore}
          <Text style={styles.scoreUnit}> / 100</Text>
        </Text>
      </View>

      {/* Pace assessment */}
      <View style={styles.card} testID="pace-card">
        <Text style={styles.cardLabel}>Reading Pace</Text>
        <Text
          style={[
            styles.paceValue,
            report.pace === 'appropriate' ? styles.paceGood : styles.paceWarning,
          ]}
          testID="pace-assessment"
        >
          {PACE_LABELS[report.pace] ?? report.pace}
        </Text>
      </View>

      {/* Mispronounced words */}
      <View style={styles.card} testID="mispronounced-card">
        <Text style={styles.cardLabel}>Mispronounced Words</Text>
        {report.mispronounced.length === 0 ? (
          <Text style={styles.emptyNote} testID="no-mispronounced">
            None — great pronunciation!
          </Text>
        ) : (
          report.mispronounced.map((item, index) => (
            <View key={index} style={styles.mispronunciationRow} testID={`mispronounced-item-${index}`}>
              <Text style={styles.mispronunciationWord}>{item.word}</Text>
              <Text style={styles.mispronunciationDetail}>
                Expected: <Text style={styles.bold}>{item.expected}</Text>
                {'  '}You said: <Text style={styles.bold}>{item.actual}</Text>
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Suggestions */}
      <View style={styles.card} testID="suggestions-card">
        <Text style={styles.cardLabel}>Suggestions</Text>
        {report.suggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionRow} testID={`suggestion-item-${index}`}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ))}
      </View>

      {/* Back button */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation?.goBack()}
        testID="go-back-button"
      >
        <Text style={styles.secondaryButtonText}>Back to Reading</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f7f8fa',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4a5568',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 15,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  scoreUnit: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#718096',
  },
  paceValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  paceGood: {
    color: '#38a169',
  },
  paceWarning: {
    color: '#d69e2e',
  },
  emptyNote: {
    fontSize: 15,
    color: '#38a169',
    fontStyle: 'italic',
  },
  mispronunciationRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  mispronunciationWord: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e53e3e',
    marginBottom: 2,
  },
  mispronunciationDetail: {
    fontSize: 14,
    color: '#4a5568',
  },
  bold: {
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#4A90E2',
    marginRight: 8,
    lineHeight: 22,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#2d3748',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#718096',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
