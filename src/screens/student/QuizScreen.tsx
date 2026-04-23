import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { supabase } from '../../services/supabase'
import { AuthService } from '../../services/auth.service'
import { AppLayout } from '../../components/AppLayout'

interface Props {
  materialId: string
  materialTitle: string
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
  onBack: () => void
}

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'short_answer'
  options: string[] | null
  correct_answer: string
  order_index: number
}

export function QuizScreen({ materialId, materialTitle, activeScreen, title, onNavigate, onLogout, onBack }: Props) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [quizId, setQuizId] = useState('')
  const [noQuiz, setNoQuiz] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('id')
        .eq('material_id', materialId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!quiz) { setNoQuiz(true); setLoading(false); return }
      setQuizId(quiz.id)

      const { data: qs } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_index')

      setQuestions(qs ?? [])
      setLoading(false)
    }
    load()
  }, [materialId])

  function setAnswer(questionId: string, answer: string) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  async function handleSubmit() {
    // Check all answered
    const unanswered = questions.filter(q => !answers[q.id]?.trim())
    if (unanswered.length > 0) {
      Alert.alert('Incomplete', `Please answer all ${questions.length} questions.`)
      return
    }

    // Calculate score
    let correct = 0
    questions.forEach(q => {
      const given = (answers[q.id] ?? '').trim().toLowerCase()
      const expected = q.correct_answer.trim().toLowerCase()
      if (q.question_type === 'multiple_choice') {
        if (given === expected) correct++
      } else {
        // Short answer: check if key words match
        const expectedWords = expected.split(/\s+/)
        const matchCount = expectedWords.filter(w => given.includes(w)).length
        if (matchCount / expectedWords.length >= 0.6) correct++
      }
    })

    const finalScore = Math.round((correct / questions.length) * 100)
    setScore(finalScore)
    setSubmitted(true)

    // Save attempt
    try {
      const session = await AuthService.getSession()
      if (session) {
        await supabase.from('quiz_attempts').insert({
          quiz_id: quizId,
          student_id: session.userId,
          score: finalScore,
          answers: answers,
        })
      }
    } catch { }
  }

  if (loading) {
    return (
      <AppLayout role="student" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      </AppLayout>
    )
  }

  if (noQuiz) {
    return (
      <AppLayout role="student" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
        <View style={styles.center}>
          <Text style={styles.noQuizIcon}>📝</Text>
          <Text style={styles.noQuizText}>No quiz available for this passage yet.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    )
  }

  if (submitted) {
    return (
      <AppLayout role="student" activeScreen={activeScreen} title="Quiz Results" onNavigate={onNavigate} onLogout={onLogout}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Score card */}
          <View style={[styles.scoreCard, score >= 70 ? styles.scoreCardPass : styles.scoreCardFail]}>
            <Text style={styles.scoreEmoji}>{score >= 90 ? '🏆' : score >= 70 ? '⭐' : '📚'}</Text>
            <Text style={styles.scoreValue}>{score}%</Text>
            <Text style={styles.scoreLabel}>{score >= 70 ? 'Great job!' : 'Keep practicing!'}</Text>
            <Text style={styles.scoreDetail}>{questions.filter(q => {
              const given = (answers[q.id] ?? '').trim().toLowerCase()
              const expected = q.correct_answer.trim().toLowerCase()
              if (q.question_type === 'multiple_choice') return given === expected
              const words = expected.split(/\s+/)
              return words.filter(w => given.includes(w)).length / words.length >= 0.6
            }).length} / {questions.length} correct</Text>
          </View>

          {/* Review answers */}
          <Text style={styles.reviewTitle}>Review</Text>
          {questions.map((q, i) => {
            const given = (answers[q.id] ?? '').trim().toLowerCase()
            const expected = q.correct_answer.trim().toLowerCase()
            let isCorrect = false
            if (q.question_type === 'multiple_choice') {
              isCorrect = given === expected
            } else {
              const words = expected.split(/\s+/)
              isCorrect = words.filter(w => given.includes(w)).length / words.length >= 0.6
            }
            return (
              <View key={q.id} style={[styles.reviewCard, isCorrect ? styles.reviewCorrect : styles.reviewWrong]}>
                <Text style={styles.reviewQ}>Q{i + 1}: {q.question_text}</Text>
                <Text style={styles.reviewYour}>Your answer: {answers[q.id] ?? '—'}</Text>
                {!isCorrect && <Text style={styles.reviewCorrectAns}>Correct: {q.correct_answer}</Text>}
                <Text style={isCorrect ? styles.reviewTick : styles.reviewCross}>{isCorrect ? '✓ Correct' : '✗ Incorrect'}</Text>
              </View>
            )
          })}

          <TouchableOpacity style={styles.doneBtn} onPress={onBack}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </AppLayout>
    )
  }

  return (
    <AppLayout role="student" activeScreen={activeScreen} title={`Quiz: ${materialTitle}`} onNavigate={onNavigate} onLogout={onLogout}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.quizTitle}>Reading Comprehension Quiz</Text>
        <Text style={styles.quizSubtitle}>{questions.length} questions · Answer all to submit</Text>

        {questions.map((q, i) => (
          <View key={q.id} style={styles.questionCard}>
            <Text style={styles.questionNum}>Question {i + 1}</Text>
            <Text style={styles.questionText}>{q.question_text}</Text>

            {q.question_type === 'multiple_choice' && q.options ? (
              <View style={styles.options}>
                {q.options.map((opt, oi) => (
                  <TouchableOpacity
                    key={oi}
                    style={[styles.option, answers[q.id] === opt && styles.optionSelected]}
                    onPress={() => setAnswer(q.id, opt)}
                  >
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + oi)}</Text>
                    <Text style={[styles.optionText, answers[q.id] === opt && styles.optionTextSelected]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.shortInput}
                placeholder="Type your answer here..."
                value={answers[q.id] ?? ''}
                onChangeText={(v) => setAnswer(q.id, v)}
                multiline
              />
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Submit Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppLayout>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noQuizIcon: { fontSize: 48, marginBottom: 12 },
  noQuizText: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  scroll: { padding: 20, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  quizTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  quizSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  questionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 2 },
  questionNum: { fontSize: 11, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', marginBottom: 6 },
  questionText: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 14, lineHeight: 22 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, gap: 10, backgroundColor: '#f9fafb' },
  optionSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  optionLetter: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e5e7eb', textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: '700', color: '#374151' },
  optionText: { fontSize: 14, color: '#374151', flex: 1 },
  optionTextSelected: { color: '#2563eb', fontWeight: '600' },
  shortInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Results
  scoreCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  scoreCardPass: { backgroundColor: '#dcfce7' },
  scoreCardFail: { backgroundColor: '#fee2e2' },
  scoreEmoji: { fontSize: 48, marginBottom: 8 },
  scoreValue: { fontSize: 48, fontWeight: '900', color: '#111827' },
  scoreLabel: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 4 },
  scoreDetail: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  reviewTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  reviewCard: { borderRadius: 10, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  reviewCorrect: { backgroundColor: '#f0fdf4', borderLeftColor: '#16a34a' },
  reviewWrong: { backgroundColor: '#fff1f2', borderLeftColor: '#dc2626' },
  reviewQ: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 6 },
  reviewYour: { fontSize: 13, color: '#374151', marginBottom: 4 },
  reviewCorrectAns: { fontSize: 13, color: '#16a34a', fontWeight: '600', marginBottom: 4 },
  reviewTick: { fontSize: 12, color: '#16a34a', fontWeight: '700' },
  reviewCross: { fontSize: 12, color: '#dc2626', fontWeight: '700' },
  doneBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
