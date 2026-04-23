import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert, Platform,
} from 'react-native'
import { supabase } from '../../services/supabase'
import { AuthService } from '../../services/auth.service'
import { AppLayout } from '../../components/AppLayout'

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
  onBack: () => void
}

interface Material { id: string; title: string; difficulty_level: string }
interface Student { id: string; name: string | null; email: string | null }

export function CreateAssignmentScreen({ activeScreen, title, onNavigate, onLogout, onBack }: Props) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [requiredScore, setRequiredScore] = useState('70')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const session = await AuthService.getSession()
    if (!session) return
    const [{ data: mats }, { data: studs }] = await Promise.all([
      supabase.from('reading_materials').select('id, title, difficulty_level').order('created_at'),
      supabase.from('profiles').select('id, name, email').eq('teacher_id', session.userId),
    ])
    setMaterials(mats ?? [])
    setStudents(studs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function toggleStudent(id: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedStudents(new Set(students.map(s => s.id)))
  }

  async function handleCreate() {
    if (!assignmentTitle.trim()) { Alert.alert('Error', 'Please enter an assignment title.'); return }
    if (!selectedMaterial) { Alert.alert('Error', 'Please select a reading material.'); return }
    if (!deadline.trim()) { Alert.alert('Error', 'Please enter a deadline (YYYY-MM-DD).'); return }
    if (selectedStudents.size === 0) { Alert.alert('Error', 'Please select at least one student.'); return }
    const score = parseInt(requiredScore)
    if (isNaN(score) || score < 0 || score > 100) { Alert.alert('Error', 'Required score must be 0–100.'); return }

    setSaving(true)
    try {
      const session = await AuthService.getSession()
      if (!session) throw new Error('Not authenticated')

      const deadlineDate = new Date(deadline + 'T23:59:59')
      if (isNaN(deadlineDate.getTime())) throw new Error('Invalid deadline date. Use YYYY-MM-DD format.')

      const { data: assignment, error } = await supabase
        .from('assignments')
        .insert({
          teacher_id: session.userId,
          material_id: selectedMaterial,
          title: assignmentTitle.trim(),
          deadline: deadlineDate.toISOString(),
          required_score: score,
        })
        .select('id')
        .single()

      if (error) throw error

      await supabase.from('assignment_students').insert(
        Array.from(selectedStudents).map((studentId) => ({
          assignment_id: assignment.id,
          student_id: studentId,
        }))
      )

      Alert.alert('Success', `Assignment "${assignmentTitle}" created for ${selectedStudents.size} student(s).`, [
        { text: 'OK', onPress: onBack }
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create assignment.')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      </AppLayout>
    )
  }

  return (
    <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Assignment Title</Text>
        <TextInput style={styles.input} placeholder="e.g. Week 3 Reading" value={assignmentTitle} onChangeText={setAssignmentTitle} editable={!saving} />

        <Text style={styles.label}>Select Reading Material</Text>
        {materials.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.selectItem, selectedMaterial === m.id && styles.selectItemActive]}
            onPress={() => setSelectedMaterial(m.id)}
          >
            <Text style={[styles.selectItemText, selectedMaterial === m.id && styles.selectItemTextActive]}>{m.title}</Text>
            <Text style={styles.selectItemBadge}>{m.difficulty_level}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder={new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}
          value={deadline}
          onChangeText={setDeadline}
          editable={!saving}
        />

        <Text style={styles.label}>Required Score (%)</Text>
        <TextInput
          style={styles.input}
          placeholder="70"
          value={requiredScore}
          onChangeText={setRequiredScore}
          keyboardType="numeric"
          editable={!saving}
        />

        <View style={styles.studentHeader}>
          <Text style={styles.label}>Assign To Students</Text>
          <TouchableOpacity onPress={selectAll}>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
        </View>
        {students.length === 0 ? (
          <Text style={styles.emptyText}>No students associated with your account.</Text>
        ) : students.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.selectItem, selectedStudents.has(s.id) && styles.selectItemActive]}
            onPress={() => toggleStudent(s.id)}
          >
            <Text style={[styles.selectItemText, selectedStudents.has(s.id) && styles.selectItemTextActive]}>
              {s.name ?? s.email ?? 'Student'}
            </Text>
            {selectedStudents.has(s.id) && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create Assignment</Text>}
        </TouchableOpacity>
      </ScrollView>
    </AppLayout>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', marginBottom: 4 },
  selectItem: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectItemActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  selectItemText: { fontSize: 14, color: '#374151', fontWeight: '500', flex: 1 },
  selectItemTextActive: { color: '#2563eb', fontWeight: '700' },
  selectItemBadge: { fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' },
  checkmark: { fontSize: 16, color: '#2563eb', fontWeight: '700' },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectAllText: { fontSize: 13, color: '#2563eb', fontWeight: '600', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
  createBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
