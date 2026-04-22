import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import type { StudentStackParamList } from './HomeScreen'
import { ttsService } from '../../services/tts.service'
import { recorderService } from '../../services/recorder.service'
import { ProgressRepo } from '../../repositories/progress.repo'
import { RecordingRepo } from '../../repositories/recording.repo'
import { AuthService } from '../../services/auth.service'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'

type Props = DrawerScreenProps<StudentStackParamList, 'Reading'>

const progressRepo = new ProgressRepo()
const recordingRepo = new RecordingRepo()

/** Generate a simple UUID-like ID using Math.random */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const RATE_MIN = 0.5
const RATE_MAX = 2.0
const RATE_STEP = 0.25

/**
 * ReadingScreen — displays a reading passage with TTS and recording controls.
 * Requirements: 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.4, 4.5, 5.1
 */
export function ReadingScreen({ route, navigation }: Props) {
  const { material } = route.params

  const [ttsRate, setTtsRate] = useState(1.0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const permissionGrantedRef = useRef(false)
  const recordingUriRef = useRef<string | null>(null)

  const difficultyColor: Record<string, string> = {
    easy: '#16a34a',
    medium: '#d97706',
    hard: '#dc2626',
  }

  // TTS: play
  function handlePlay() {
    ttsService.speak(material.content, ttsRate)
    setIsSpeaking(true)
  }

  // TTS: stop
  function handleStop() {
    ttsService.stop()
    setIsSpeaking(false)
  }

  // TTS: decrease rate
  function handleRateDown() {
    setTtsRate((r) => Math.max(RATE_MIN, parseFloat((r - RATE_STEP).toFixed(2))))
  }

  // TTS: increase rate
  function handleRateUp() {
    setTtsRate((r) => Math.min(RATE_MAX, parseFloat((r + RATE_STEP).toFixed(2))))
  }

  // Recording: toggle start/stop
  async function handleRecordToggle() {
    if (isRecording) {
      // Stop recording
      try {
        const uri = await recorderService.stopRecording()
        recordingUriRef.current = uri
        setIsRecording(false)
      } catch (err) {
        Alert.alert('Recording Error', 'Failed to stop recording.')
        setIsRecording(false)
      }
      return
    }

    // Request permission before first recording
    if (!permissionGrantedRef.current) {
      const granted = await recorderService.requestPermission()
      if (!granted) {
        setPermissionDenied(true)
        return
      }
      permissionGrantedRef.current = true
    }

    // Start recording
    try {
      await recorderService.startRecording()
      setIsRecording(true)
    } catch (err) {
      Alert.alert('Recording Error', 'Failed to start recording.')
    }
  }

  // Session complete: save progress + recording
  async function handleFinish() {
    if (isSaving) return
    setIsSaving(true)

    // Stop TTS if still playing
    if (isSpeaking) {
      ttsService.stop()
      setIsSpeaking(false)
    }

    // Stop recording if still active
    let finalUri = recordingUriRef.current
    if (isRecording) {
      try {
        finalUri = await recorderService.stopRecording()
        recordingUriRef.current = finalUri
        setIsRecording(false)
      } catch {
        // proceed without recording URI
      }
    }

    try {
      const session = await AuthService.getSession()
      const studentId = session?.userId ?? 'unknown'

      const progressId = generateId()
      await progressRepo.save({
        id: progressId,
        studentId,
        materialId: material.id,
        materialTitle: material.title,
        score: 0,
        fluencyRating: 'pending',
        wordsPerMinute: 0,
        sessionDate: new Date(),
        synced: false,
      })

      if (finalUri) {
        await recordingRepo.save({
          id: generateId(),
          progressRecordId: progressId,
          localUri: finalUri,
          synced: false,
        })
      }

      navigation.goBack()
    } catch (err) {
      Alert.alert('Error', 'Failed to save session. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <ConnectivityIndicator />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Text style={styles.title}>{material.title}</Text>
        <Text
          style={[
            styles.difficulty,
            { color: difficultyColor[material.difficultyLevel] ?? '#555' },
          ]}
          accessibilityLabel={`Difficulty: ${material.difficultyLevel}`}
        >
          {material.difficultyLevel.charAt(0).toUpperCase() + material.difficultyLevel.slice(1)}
        </Text>

        {/* Passage */}
        <Text style={styles.content}>{material.content}</Text>

        {/* TTS Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Text-to-Speech</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, isSpeaking && styles.buttonActive]}
              onPress={handlePlay}
              disabled={isSpeaking}
              accessibilityRole="button"
              accessibilityLabel="Play text-to-speech"
            >
              <Text style={styles.buttonText}>▶ Play</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={handleStop}
              accessibilityRole="button"
              accessibilityLabel="Stop text-to-speech"
            >
              <Text style={styles.buttonText}>■ Stop</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rateRow}>
            <TouchableOpacity
              style={styles.rateButton}
              onPress={handleRateDown}
              disabled={ttsRate <= RATE_MIN}
              accessibilityRole="button"
              accessibilityLabel="Decrease speech rate"
            >
              <Text style={styles.rateButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.rateLabel} accessibilityLabel={`Speech rate: ${ttsRate}x`}>
              {ttsRate.toFixed(2)}×
            </Text>
            <TouchableOpacity
              style={styles.rateButton}
              onPress={handleRateUp}
              disabled={ttsRate >= RATE_MAX}
              accessibilityRole="button"
              accessibilityLabel="Increase speech rate"
            >
              <Text style={styles.rateButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recording Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recording</Text>
          {permissionDenied && (
            <Text style={styles.errorText} accessibilityRole="alert">
              Microphone permission denied. Please enable it in device settings.
            </Text>
          )}
          <TouchableOpacity
            style={[styles.button, isRecording && styles.buttonDanger]}
            onPress={handleRecordToggle}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <Text style={styles.buttonText}>
              {isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}
            </Text>
          </TouchableOpacity>
          {recordingUriRef.current && !isRecording && (
            <Text style={styles.recordingDone} accessibilityLabel="Recording saved">
              Recording saved ✓
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Finish Button */}
      <TouchableOpacity
        style={[styles.finishButton, isSaving && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={isSaving}
        accessibilityRole="button"
        accessibilityLabel="Finish reading session"
      >
        <Text style={styles.finishButtonText}>{isSaving ? 'Saving…' : 'Finish'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  difficulty: { fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'capitalize' },
  content: { fontSize: 16, lineHeight: 26, color: '#374151', marginBottom: 24 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonActive: { backgroundColor: '#1d4ed8' },
  buttonDanger: { backgroundColor: '#dc2626' },
  buttonDisabled: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 16 },
  rateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateButtonText: { fontSize: 20, color: '#374151', lineHeight: 24 },
  rateLabel: { fontSize: 16, fontWeight: '600', color: '#111827', minWidth: 52, textAlign: 'center' },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  recordingDone: { color: '#16a34a', fontSize: 13, marginTop: 8, textAlign: 'center' },
  finishButton: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  finishButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
