import React, { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native'
import { ttsService } from '../../services/tts.service'
import { recorderService } from '../../services/recorder.service'
import { ProgressRepo } from '../../repositories/progress.repo'
import { RecordingRepo } from '../../repositories/recording.repo'
import { AuthService } from '../../services/auth.service'
import { GamificationService } from '../../services/gamification.service'
import { supabase } from '../../services/supabase'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'
import { AppLayout } from '../../components/AppLayout'
import type { ReadingMaterial } from '../../types'

interface Props {
  material: ReadingMaterial
  readingParams?: any
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

const RATE_MIN = 0.5, RATE_MAX = 2.0, RATE_STEP = 0.25

type Mode = 'reading' | 'practice'

export function ReadingScreen({ material, readingParams, activeScreen, title, onNavigate, onLogout, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('reading')
  const [ttsRate, setTtsRate] = useState(1.0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [markedWords, setMarkedWords] = useState<Set<number>>(new Set())
  const [isRecording, setIsRecording] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // Practice mode state
  const [practiceWords, setPracticeWords] = useState<string[]>([])
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [practiceSpeaking, setPracticeSpeaking] = useState(false)

  const permissionGrantedRef = useRef(false)
  const recordingUriRef = useRef<string | null>(null)

  const words = material.content.split(/\s+/)
  const difficultyColor: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' }

  useEffect(() => {
    ttsService.setOnWord((idx) => setCurrentWordIndex(idx))
    ttsService.setOnEnd(() => { setCurrentWordIndex(-1); setIsSpeaking(false); setPracticeSpeaking(false) })
    return () => { ttsService.setOnWord(null); ttsService.setOnEnd(null) }
  }, [])

  // Toggle word as mispronounced
  function toggleMark(index: number) {
    setMarkedWords((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handlePlay() {
    setCurrentWordIndex(-1)
    ttsService.speak(material.content, ttsRate)
    setIsSpeaking(true)
  }

  function handleStop() {
    ttsService.stop()
    setIsSpeaking(false)
    setCurrentWordIndex(-1)
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
    if (isSpeaking) { ttsService.stop(); setIsSpeaking(false) }
    let finalUri = recordingUriRef.current
    if (isRecording) { try { finalUri = await recorderService.stopRecording() } catch {} setIsRecording(false) }
    try {
      const session = await AuthService.getSession()
      const studentId = session?.userId ?? 'unknown'
      const progressId = generateId()
      await progressRepo.save({ id: progressId, studentId, materialId: material.id, materialTitle: material.title, score: 0, fluencyRating: 'pending', wordsPerMinute: 0, sessionDate: new Date(), synced: false })
      if (finalUri) await recordingRepo.save({ id: generateId(), progressRecordId: progressId, localUri: finalUri, synced: false })

      // Also save to Supabase directly on web
      if (Platform.OS === 'web') {
        await supabase.from('progress_records').insert({
          id: progressId,
          student_id: studentId,
          material_id: material.id,
          material_title: material.title,
          score: 0,
          fluency_rating: 'pending',
          words_per_minute: 0,
          session_date: new Date().toISOString(),
        })
      }
      const allRecords = await progressRepo.getByStudent(studentId)
      const result = await GamificationService.updateAfterSession(studentId, 0, 0, allRecords.length)
      if (result.newBadges.length > 0) {
        Alert.alert('🏅 Badge Earned!', result.newBadges.map(b => `${b.icon} ${b.label}`).join('\n'))
      }

      // Mark assignment complete if this was an assignment session
      if (readingParams?.assignmentStudentId) {
        await supabase
          .from('assignment_students')
          .update({ completed: true, completed_at: new Date().toISOString(), score: 0 })
          .eq('id', readingParams.assignmentStudentId)
      }

      // If there are marked words, offer practice mode
      if (markedWords.size > 0) {
        const struggled = Array.from(markedWords).map(i => words[i]).filter(Boolean)
        // Deduplicate
        const unique = [...new Set(struggled.map(w => w.replace(/[^a-zA-Z']/g, '').toLowerCase()))].filter(Boolean)
        setPracticeWords(unique)
        setPracticeIndex(0)
        setMode('practice')
      } else {
        onBack()
      }
    } catch { Alert.alert('Error', 'Failed to save session.') } finally { setIsSaving(false) }
  }

  // Practice mode: speak current word
  function speakPracticeWord(word: string) {
    ttsService.stop()
    setPracticeSpeaking(true)
    ttsService.speak(word, 0.7) // slower rate for practice
  }

  if (mode === 'practice') {
    return (
      <AppLayout role="student" activeScreen={activeScreen} title="Practice Mode" onNavigate={onNavigate} onLogout={onLogout}>
        <ScrollView contentContainerStyle={styles.practiceScroll}>
          <Text style={styles.practiceHeading}>🎯 Practice These Words</Text>
          <Text style={styles.practiceSubtitle}>You marked {practiceWords.length} word{practiceWords.length !== 1 ? 's' : ''} to practice. Tap each word to hear it.</Text>

          <View style={styles.wordGrid}>
            {practiceWords.map((word, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.practiceWord, practiceIndex === i && styles.practiceWordActive]}
                onPress={() => { setPracticeIndex(i); speakPracticeWord(word) }}
              >
                <Text style={[styles.practiceWordText, practiceIndex === i && styles.practiceWordTextActive]}>
                  {word}
                </Text>
                <Text style={styles.practiceWordIcon}>{practiceIndex === i && practiceSpeaking ? '🔊' : '▶'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Retry session with just these words */}
          <View style={styles.practiceSection}>
            <Text style={styles.practiceSectionTitle}>📖 Retry Session</Text>
            <Text style={styles.practiceSectionText}>
              {practiceWords.join(' · ')}
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => {
                  ttsService.stop()
                  ttsService.speak(practiceWords.join('. '), 0.7)
                  setPracticeSpeaking(true)
                }}
              >
                <Text style={styles.btnText}>▶ Read All Words</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#6b7280' }]} onPress={() => { ttsService.stop(); setPracticeSpeaking(false) }}>
                <Text style={styles.btnText}>■ Stop</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => { ttsService.stop(); onBack() }}>
            <Text style={styles.doneBtnText}>✓ Done Practicing</Text>
          </TouchableOpacity>
        </ScrollView>
      </AppLayout>
    )
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

        {/* Hint */}
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>💡 Tap any word you struggle with to mark it for practice</Text>
        </View>

        {/* Word-highlighted passage */}
        <View style={styles.passageContainer}>
          <Text style={styles.passage}>
            {words.map((word, index) => (
              <Text
                key={index}
                style={[
                  styles.word,
                  index === currentWordIndex && styles.wordHighlighted,
                  markedWords.has(index) && styles.wordMarked,
                ]}
                onPress={() => toggleMark(index)}
              >
                {word}{' '}
              </Text>
            ))}
          </Text>
        </View>

        {markedWords.size > 0 && (
          <View style={styles.markedInfo}>
            <Text style={styles.markedInfoText}>🔴 {markedWords.size} word{markedWords.size !== 1 ? 's' : ''} marked for practice</Text>
          </View>
        )}

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
          {permissionDenied && <Text style={styles.errorText}>Microphone permission denied.</Text>}
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
  difficulty: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  hintBox: { backgroundColor: '#fffbeb', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a' },
  hintText: { fontSize: 12, color: '#92400e' },
  passageContainer: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16,
    marginBottom: 12, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  passage: { fontSize: 17, lineHeight: 32, color: '#374151' },
  word: { fontSize: 17, lineHeight: 32, color: '#374151' },
  wordHighlighted: { backgroundColor: '#bfdbfe', color: '#1e40af', fontWeight: '700', borderRadius: 3 },
  wordMarked: { backgroundColor: '#fee2e2', color: '#dc2626', textDecorationLine: 'underline', fontWeight: '600' },
  markedInfo: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 12 },
  markedInfoText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },
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
  // Practice mode
  practiceScroll: { padding: 20, paddingBottom: 40 },
  practiceHeading: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  practiceSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  practiceWord: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#e5e7eb', elevation: 1,
  },
  practiceWordActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  practiceWordText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  practiceWordTextActive: { color: '#2563eb' },
  practiceWordIcon: { fontSize: 14, color: '#9ca3af' },
  practiceSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 2 },
  practiceSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  practiceSectionText: { fontSize: 15, color: '#374151', lineHeight: 26, marginBottom: 14 },
  doneBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
