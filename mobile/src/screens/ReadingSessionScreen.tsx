/**
 * ReadingSessionScreen
 *
 * Displays a reading passage with word-level TTS highlighting.
 * Controls: Start Reading → Pause / Resume → (on complete) Record My Reading.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import recorderService from '../services/RecorderService';
import ttsEngine from '../services/TTSEngine';
import { ReadingMaterial } from '../types';

// ─── Navigation prop shape ───────────────────────────────────────────────────
interface Props {
  navigation?: { navigate: (screen: string, params?: object) => void; goBack: () => void };
  route?: { params?: { material?: ReadingMaterial } };
  material?: ReadingMaterial;
}

type SessionState = 'idle' | 'speaking' | 'paused' | 'complete';
type RecordingState = 'idle' | 'recording' | 'stopped';

export default function ReadingSessionScreen({ navigation, route, material: propMaterial }: Props) {
  const material: ReadingMaterial | undefined = propMaterial ?? route?.params?.material;

  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  // Pulsing animation for recording indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Split text into words once.
  const words = useRef<string[]>([]);
  useEffect(() => {
    if (material?.text) {
      words.current = material.text.trim().split(/\s+/).filter(Boolean);
    }
  }, [material?.text]);

  // Register TTS callbacks once on mount.
  useEffect(() => {
    ttsEngine.onWordBoundary((index) => {
      setCurrentWordIndex(index);
    });
    ttsEngine.onComplete(() => {
      setSessionState('complete');
      setCurrentWordIndex(-1);
    });

    return () => {
      ttsEngine.stop();
    };
  }, []);

  // Start/stop pulse animation based on recording state
  useEffect(() => {
    if (recordingState === 'recording') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [recordingState, pulseAnim]);

  const handleStartReading = useCallback(() => {
    if (!material) return;
    setCurrentWordIndex(-1);
    setSessionState('speaking');
    ttsEngine.speak(material.text, {
      rate: material.defaultTTSRate,
      language: material.language,
    });
  }, [material]);

  const handlePause = useCallback(() => {
    ttsEngine.pause();
    setSessionState('paused');
  }, []);

  const handleResume = useCallback(() => {
    ttsEngine.resume();
    setSessionState('speaking');
  }, []);

  const handleRecordMyReading = useCallback(async () => {
    const status = await recorderService.requestPermission();
    if (status !== 'granted') {
      setPermissionModalVisible(true);
      return;
    }
    await recorderService.startRecording();
    setRecordingState('recording');
  }, []);

  const handleStopRecording = useCallback(async () => {
    const result = await recorderService.stopRecording();
    setRecordingState('stopped');
    navigation?.navigate('Feedback', { recordingUri: result.uri, material });
  }, [navigation, material]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!material) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No reading material selected.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Permission denied modal */}
      <Modal
        visible={permissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPermissionModalVisible(false)}
        testID="permission-modal"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Microphone Access Required</Text>
            <Text style={styles.modalBody}>
              This app needs microphone access to record your reading. Please enable it in your device settings.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setPermissionModalVisible(false);
                Linking.openSettings();
              }}
              testID="open-settings-button"
            >
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setPermissionModalVisible(false)}
              testID="dismiss-modal-button"
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Title */}
      <Text style={styles.title} testID="material-title">
        {material.title}
      </Text>

      {/* Passage with word-level highlighting */}
      <ScrollView
        style={styles.passageContainer}
        contentContainerStyle={styles.passageContent}
        testID="passage-scroll"
      >
        <Text style={styles.passage}>
          {words.current.map((word, index) => (
            <Text
              key={index}
              style={[
                styles.word,
                index === currentWordIndex && styles.wordHighlighted,
              ]}
              testID={`word-${index}`}
            >
              {word}
              {index < words.current.length - 1 ? ' ' : ''}
            </Text>
          ))}
        </Text>
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        {sessionState === 'idle' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartReading}
            testID="start-reading-button"
          >
            <Text style={styles.primaryButtonText}>Start Reading</Text>
          </TouchableOpacity>
        )}

        {sessionState === 'speaking' && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePause}
            testID="pause-button"
          >
            <Text style={styles.secondaryButtonText}>Pause</Text>
          </TouchableOpacity>
        )}

        {sessionState === 'paused' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleResume}
            testID="resume-button"
          >
            <Text style={styles.primaryButtonText}>Resume</Text>
          </TouchableOpacity>
        )}

        {sessionState === 'complete' && recordingState === 'idle' && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleRecordMyReading}
            testID="record-reading-button"
          >
            <Text style={styles.primaryButtonText}>Record My Reading</Text>
          </TouchableOpacity>
        )}

        {recordingState === 'recording' && (
          <View style={styles.recordingContainer}>
            <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} testID="recording-indicator" />
            <Text style={styles.recordingText}>Recording...</Text>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopRecording}
              testID="stop-recording-button"
            >
              <Text style={styles.primaryButtonText}>Stop Recording</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  passageContainer: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  passageContent: {
    padding: 16,
  },
  passage: {
    fontSize: 18,
    lineHeight: 30,
    color: '#2d3748',
    flexWrap: 'wrap',
  },
  word: {
    fontSize: 18,
    lineHeight: 30,
    color: '#2d3748',
  },
  wordHighlighted: {
    backgroundColor: '#fef08a',
    color: '#1a1a1a',
    borderRadius: 3,
  },
  controls: {
    padding: 20,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#718096',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#38a169',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#e53e3e',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingContainer: {
    alignItems: 'center',
  },
  recordingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53e3e',
    marginBottom: 8,
  },
  recordingText: {
    fontSize: 16,
    color: '#e53e3e',
    fontWeight: '600',
    marginBottom: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  dismissButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  dismissButtonText: {
    fontSize: 15,
    color: '#718096',
  },
});
