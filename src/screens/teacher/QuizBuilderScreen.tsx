import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Alert, Modal,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native'
import { supabase } from '../../services/supabase'
import { AuthService } from '../../services/auth.service'
import { AppLayout } from '../../components/AppLayout'

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
}

interface Material { id: string; title: string }
interface Question {
  id?: string
  question_text: string
  question_type: 'multiple_choice' | 'short_answer'
  options: string[]
  correct_answer: string
  order_index: number
}
interface Quiz {
  id: string
  material_title: string
  question_count: number
  created_at: string
}

export function QuizBuilderScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [teacherId, setTeacherId] = useState('')

  const fetchQuizzes = useCallback(async () => {
    setLoading(true)
    try {
      const session = await AuthService.getSession()
      if (!session) return
      setTeacherId(session.userId)
      const { data } = await supabase
        .from('quizzes')
        .select('id, created_at, reading_materials(title), quiz_questions(id)')
        .eq('teacher_id', session.userId)
        .order('created_at', { ascending: false })
      setQuizzes((data ?? []).map((q: any) => ({
        id: q.id,
        material_title: q.reading_materials?.title ?? '—',
        question_count: q.quiz_questions?.length ?? 0,
        created_at: q.created_at,
      })))
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchQuizzes() }, [fetchQuizzes])

  async function handleDelete(quizId: string) {
    Alert.alert('Delete Quiz', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('quizzes').delete().eq('id', quizId)
          fetchQuizzes()
        }
      }
    ])
  }

  return (
    <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <FlatList
          data={quizzes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowBuilder(true)}>
              <Text style={styles.createBtnText}>+ Create Quiz</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No quizzes yet.</Text>
              <Text style={styles.emptyHint}>Create a quiz for a reading material.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📖 {item.material_title}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteBtn}>🗑</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardMeta}>{item.question_count} questions · Created {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
        />
      )}

      <QuizBuilderModal
        visible={showBuilder}
        teacherId={teacherId}
        onClose={() => setShowBuilder(false)}
        onCreated={() => { setShowBuilder(false); fetchQuizzes() }}
      />
    </AppLayout>
  )
}

function QuizBuilderModal({ visible, teacherId, onClose, onCreated }: {
  visible: boolean; teacherId: string; onClose: () => void; onCreated: () => void
}) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    supabase.from('reading_materials').select('id, title').order('title')
      .then(({ data }) => {
        setMaterials(data ?? [])
        if (data?.[0]) setSelectedMaterial(data[0].id)
      })
    setQuestions([])
  }, [visible])

  function addQuestion(type: 'multiple_choice' | 'short_answer') {
    setQuestions(prev => [...prev, {
      question_text: '',
      question_type: type,
      options: type === 'multiple_choice' ? ['', '', '', ''] : [],
      correct_answer: '',
      order_index: prev.length,
    }])
  }

  function updateQuestion(index: number, field: keyof Question, value: any) {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const opts = [...q.options]
      opts[oIndex] = value
      return { ...q, options: opts }
    }))
  }

  function removeQuestion(index: number) {
    setQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order_index: i })))
  }

  async function handleSave() {
    if (!selectedMaterial) { Alert.alert('Error', 'Select a material.'); return }
    if (questions.length === 0) { Alert.alert('Error', 'Add at least one question.'); return }
    for (const q of questions) {
      if (!q.question_text.trim()) { Alert.alert('Error', 'All questions need text.'); return }
      if (!q.correct_answer.trim()) { Alert.alert('Error', 'All questions need a correct answer.'); return }
      if (q.question_type === 'multiple_choice' && q.options.some(o => !o.trim())) {
        Alert.alert('Error', 'Fill in all answer options.'); return
      }
    }
    setSaving(true)
    try {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .insert({ material_id: selectedMaterial, teacher_id: teacherId })
        .select('id').single()
      if (error) throw error
      await supabase.from('quiz_questions').insert(
        questions.map(q => ({
          quiz_id: quiz.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.question_type === 'multiple_choice' ? q.options : null,
          correct_answer: q.correct_answer,
          order_index: q.order_index,
        }))
      )
      onCreated()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save quiz.')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Quiz</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Reading Material</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {materials.map((m) => (
                <TouchableOpacity key={m.id} style={[styles.chip, selectedMaterial === m.id && styles.chipActive]} onPress={() => setSelectedMaterial(m.id)}>
                  <Text style={[styles.chipText, selectedMaterial === m.id && styles.chipTextActive]}>{m.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Questions ({questions.length})</Text>
            {questions.map((q, qi) => (
              <View key={qi} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNum}>Q{qi + 1} · {q.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Short Answer'}</Text>
                  <TouchableOpacity onPress={() => removeQuestion(qi)}><Text style={styles.removeBtn}>✕</Text></TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Question text"
                  value={q.question_text}
                  onChangeText={(v) => updateQuestion(qi, 'question_text', v)}
                  multiline
                />
                {q.question_type === 'multiple_choice' && (
                  <>
                    <Text style={styles.subLabel}>Answer Options</Text>
                    {q.options.map((opt, oi) => (
                      <TextInput
                        key={oi}
                        style={[styles.input, styles.optionInput]}
                        placeholder={`Option ${oi + 1}`}
                        value={opt}
                        onChangeText={(v) => updateOption(qi, oi, v)}
                      />
                    ))}
                  </>
                )}
                <Text style={styles.subLabel}>Correct Answer</Text>
                <TextInput
                  style={[styles.input, styles.correctInput]}
                  placeholder={q.question_type === 'multiple_choice' ? 'Type the correct option exactly' : 'Expected answer'}
                  value={q.correct_answer}
                  onChangeText={(v) => updateQuestion(qi, 'correct_answer', v)}
                />
              </View>
            ))}

            <View style={styles.addRow}>
              <TouchableOpacity style={styles.addBtn} onPress={() => addQuestion('multiple_choice')}>
                <Text style={styles.addBtnText}>+ Multiple Choice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#7c3aed' }]} onPress={() => addQuestion('short_answer')}>
                <Text style={styles.addBtnText}>+ Short Answer</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Quiz</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  createBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 4 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 16, color: '#6b7280' },
  emptyHint: { fontSize: 13, color: '#9ca3af', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  deleteBtn: { fontSize: 18 },
  cardMeta: { fontSize: 13, color: '#6b7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#6b7280' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  subLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 4, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  questionCard: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  questionNum: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  removeBtn: { fontSize: 16, color: '#dc2626' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff', marginBottom: 4 },
  optionInput: { marginBottom: 6 },
  correctInput: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  addRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  saveBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
