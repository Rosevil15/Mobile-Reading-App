import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native'
import { ttsService } from '../../services/tts.service'
import { recorderService } from '../../services/recorder.service'
import { ProgressRepo } from '../../repositories/progress.repo'
import { RecordingRepo } from '../../repositories/recording.repo'
import { AuthService } from '../../services/auth.service'
import { GamificationService } from '../../services/gamification.service'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'
import { AppLayout } from '../../components/AppLayout'
import type { ReadingMaterial } from '../../types'

interface Props {
  material: ReadingMaterial
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
  onBack: () => void
}

const progressRepo = new ProgressRepo()
const recordingRepo = new RecordingRepo()

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// Average ms per word at 1x speed (roughly 150 words/min)
const MS_PER_WORD_BASE = 400
const RATE_MIN = 0.5, RATE_MAX = 2.0, RATE_STEP = 0.25

export function ReadingScreen({ material, activeScreen, title, onNavigate, onLogout, onBack }: Props) {
  const [ttsRate, setTtsRate] = useState(1.0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [isRecording, setIsRecording] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const permissionGrantedRef = useRef(false)
  const recordingUriRef = useRef<string | null>(null)
  const wordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wordIndexRef = useRef(0)

  const words = material.content.split(/\s+/)

  const difficultyColor: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' }

  const stopWordHighlight = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current)
      wordTimerRef.current = null
    }
    setCurrentWordIndex(-1)
    wordIndexRef.current = 0
  }, [])

  const startWordHighlight = useCallback((rate: number) => {
    stopWordHighlight()
    const msPerWord = MS_PER_WORD_BASE / rate
    wordIndexRef.current = 0
    wordTimerRef.current = setInterval(() => {
      if (wordIndexRef.current >= words.length) {
        stopWordHighlight()
        setIsSpeaking(false)
        return
      }
      setCurrentWordIndex(wordIndexRef.current)
      wordIndexRef.current++
    }, msPerWord)
  }, [words.length, stopWordHighlight])

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopWordHighlight() }
  }, [stopWordHighlight])

  function handlePlay() {
    ttsService.speak(material.content, ttsRate)
    setIsSpeaking(true)
    startWordHighlight(ttsRate)
  }

  function handleStop() {
    ttsService.stop()
    setIsSpeaking(false)
    stopWordHighlight()
  }

  function handleRateDown() { setTtsRate((r) => Math.max(RATE_MIN, parseFloat((r - RATE_STEP).toFixed(2)))) }
  function handleRateUp() { setTtsRate((r) => Math.min(RATE_MAX, parseFloat((r + RATE_STEP).toFixed(2)))) }

  async function handleRecordToggle() {
    if (isRecording) {
      try { const uri = await recorderService.stopRecording(); recordingUriRef.current = uri } catch {}
      setIsRecording(false); return
    }
    if (Platform.OS === 'web') { Alert.alert('Not supported', 'Recording is not available on web.'); return }
    if (!permissionGrantedRef.current) {
      const granted = await recorderService.requestPermission()
      if (!granted) { setPermissionDenied(true); return }
      permissionGrantedRef.current = true
    }
    try { await recorderService.startRecording(); setIsRecording(true) } catch { Alert.alert('Error', 'Failed to start recording.') }
  }

  async function handleFinish() {
    if (isSaving) return
    setIsSaving(true)
    if (isSpeaking) { ttsService.stop(); setIsSpeaking(false); stopWordHighlight() }
    let finalUri = recordingUriRef.current
    if (isRecording) { try { finalUri = await recorderService.stopRecording() } catch {} setIsRecording(false) }
    try {
      const session = await AuthService.getSession()
      const studentId = session?.userId ?? 'unknown'
      const progressId = generateId()
      await progressRepo.save({ id: progressId, studentId, materialId: material.id, materialTitle: material.title, score: 0, fluencyRating: 'pending', wordsPerMinute: 0, sessionDate: new Date(), synced: false })
      if (finalUri) await recordingRepo.save({ id: generateId(), progressRecordId: progressId, localUri: finalUri, synced: false })

      // Update gamification
      const allRecords = await progressRepo.getByStudent(studentId)
      const result = await GamificationService.updateAfterSession(studentId, 0, 0, allRecords.length)
      if (result.newBadges.length > 0) {
        Alert.alert('🏅 Badge Earned!', result.newBadges.map(b => `${b.icon} ${b.label}`).join('\n'))
      }

      onBack()
    } catch { Alert.alert('Error', 'Failed to save session.') } finally { setIsSaving(false) }
  }

  return (
    <AppLayout role="student" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ConnectivityIndicator />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{material.title}</Text>
        <Text style={[styles.difficulty, { color: difficultyColor[material.difficultyLevel] ?? '#555' }]}>
          {material.difficultyLevel.charAt(0).toUpperCase() + material.difficultyLevel.slice(1)}
        </Text>

        {/* Word-highlighted passage */}
        <View style={styles.passageContainer}>
          <Text style={styles.passage}>
            {words.map((word, index) => (
              <Text
                key={index}
                style={[
                  styles.word,
                  index === currentWordIndex && styles.wordHighlighted,
                ]}
              >
                {word}{' '}
              </Text>
            ))}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Text-to-Speech</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, isSpeaking && styles.btnActive]} onPress={handlePlay} disabled={isSpeaking}>
              <Text style={styles.btnText}>▶ Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleStop}>
              <Text style={styles.btnText}>■ Stop</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rateRow}>
            <TouchableOpacity style={styles.rateBtn} onPress={handleRateDown} disabled={ttsRate <= RATE_MIN}>
              <Text style={styles.rateBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.rateLabel}>{ttsRate.toFixed(2)}×</Text>
            <TouchableOpacity style={styles.rateBtn} onPress={handleRateUp} disabled={ttsRate >= RATE_MAX}>
              <Text style={styles.rateBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recording</Text>
          {permissionDenied && <Text style={styles.errorText}>Microphone permission denied. Enable it in device settings.</Text>}
          <TouchableOpacity style={[styles.btn, isRecording && styles.btnDanger]} onPress={handleRecordToggle}>
            <Text style={styles.btnText}>{isRecording ? '⏹ Stop Recording' : '⏺ Start Recording'}</Text>
          </TouchableOpacity>
          {recordingUriRef.current && !isRecording && <Text style={styles.savedText}>Recording saved ✓</Text>}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.finishBtn, isSaving && styles.btnDisabled]} onPress={handleFinish} disabled={isSaving}>
        <Text style={styles.finishBtnText}>{isSaving ? 'Saving…' : 'Finish'}</Text>
      </TouchableOpacity>
    </AppLayout>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 100 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  difficulty: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
  passageContainer: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16,
    marginBottom: 20, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  passage: { fontSize: 17, lineHeight: 30, color: '#374151' },
  word: { fontSize: 17, lineHeight: 30, color: '#374151' },
  wordHighlighted: {
    backgroundColor: '#bfdbfe',
    color: '#1e40af',
    fontWeight: '700',
    borderRadius: 3,
  },
  section: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, elevation: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnActive: { backgroundColor: '#1d4ed8' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 16 },
  rateBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  rateBtnText: { fontSize: 20, color: '#374151' },
  rateLabel: { fontSize: 16, fontWeight: '600', color: '#111827', minWidth: 52, textAlign: 'center' },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  savedText: { color: '#16a34a', fontSize: 13, marginTop: 8, textAlign: 'center' },
  finishBtn: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', elevation: 4 },
  finishBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
