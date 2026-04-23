import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, TextInput, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
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

interface Assignment {
  id: string
  title: string
  deadline: string
  required_score: number
  material_title: string
  total_students: number
  completed_count: number
}

interface Material { id: string; title: string }
interface Student { id: string; name: string | null; email: string | null }

export function AssignmentsScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [teacherId, setTeacherId] = useState('')

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    try {
      const session = await AuthService.getSession()
      if (!session) return
      setTeacherId(session.userId)

      const { data } = await supabase
        .from('assignments')
        .select(`
          id, title, deadline, required_score,
          reading_materials ( title ),
          assignment_students ( id, completed )
        `)
        .eq('teacher_id', session.userId)
        .order('deadline', { ascending: true })

      const mapped: Assignment[] = (data ?? []).map((a: any) => ({
        id: a.id,
        title: a.title,
        deadline: a.deadline,
        required_score: a.required_score,
        material_title: a.reading_materials?.title ?? '—',
        total_students: a.assignment_students?.length ?? 0,
        completed_count: (a.assignment_students ?? []).filter((s: any) => s.completed).length,
      }))
      setAssignments(mapped)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  const isOverdue = (deadline: string) => new Date(deadline) < new Date()

  return (
    <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.createBtnText}>+ Create Assignment</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No assignments yet.</Text>
              <Text style={styles.emptyHint}>Tap "Create Assignment" to get started.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, isOverdue(item.deadline) && styles.cardOverdue]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {isOverdue(item.deadline) && <Text style={styles.overdueBadge}>Overdue</Text>}
              </View>
              <Text style={styles.cardMaterial}>📖 {item.material_title}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.metaItem}>📅 {new Date(item.deadline).toLocaleDateString()}</Text>
                <Text style={styles.metaItem}>⭐ Min score: {item.required_score}%</Text>
                <Text style={styles.metaItem}>✅ {item.completed_count}/{item.total_students} done</Text>
              </View>
              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, {
                  width: item.total_students > 0
                    ? `${Math.round((item.completed_count / item.total_students) * 100)}%` as any
                    : '0%',
                }]} />
              </View>
            </View>
          )}
        />
      )}

      <CreateAssignmentModal
        visible={showCreate}
        teacherId={teacherId}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); fetchAssignments() }}
      />
    </AppLayout>
  )
}

function CreateAssignmentModal({ visible, teacherId, onClose, onCreated }: {
  visible: boolean; teacherId: string; onClose: () => void; onCreated: () => void
}) {
  const [assignTitle, setAssignTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [requiredScore, setRequiredScore] = useState('70')
  const [materials, setMaterials] = useState<Material[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible || !teacherId) return
    Promise.all([
      supabase.from('reading_materials').select('id, title').order('title'),
      supabase.from('profiles').select('id, name, email').eq('teacher_id', teacherId),
    ]).then(([{ data: mats }, { data: studs }]) => {
      setMaterials(mats ?? [])
      setStudents(studs ?? [])
      if (mats?.[0]) setSelectedMaterial(mats[0].id)
    })
  }, [visible, teacherId])

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
    if (!assignTitle.trim()) { Alert.alert('Error', 'Please enter a title.'); return }
    if (!deadline) { Alert.alert('Error', 'Please enter a deadline.'); return }
    if (!selectedMaterial) { Alert.alert('Error', 'Please select a material.'); return }
    if (selectedStudents.size === 0) { Alert.alert('Error', 'Please select at least one student.'); return }
    const score = parseInt(requiredScore)
    if (isNaN(score) || score < 0 || score > 100) { Alert.alert('Error', 'Required score must be 0–100.'); return }

    setSaving(true)
    try {
      const { data: assignment, error } = await supabase
        .from('assignments')
        .insert({
          teacher_id: teacherId,
          material_id: selectedMaterial,
          title: assignTitle.trim(),
          deadline: new Date(deadline).toISOString(),
          required_score: score,
        })
        .select('id')
        .single()

      if (error) throw error

      await supabase.from('assignment_students').insert(
        Array.from(selectedStudents).map((sid) => ({
          assignment_id: assignment.id,
          student_id: sid,
        }))
      )

      setAssignTitle(''); setDeadline(''); setRequiredScore('70')
      setSelectedStudents(new Set())
      onCreated()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create assignment.')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Assignment</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Assignment Title</Text>
            <TextInput style={styles.input} placeholder="e.g. Week 1 Reading" value={assignTitle} onChangeText={setAssignTitle} editable={!saving} />

            <Text style={styles.label}>Reading Material</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {materials.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, selectedMaterial === m.id && styles.chipActive]}
                  onPress={() => setSelectedMaterial(m.id)}
                >
                  <Text style={[styles.chipText, selectedMaterial === m.id && styles.chipTextActive]}>{m.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2026-05-01" value={deadline} onChangeText={setDeadline} editable={!saving} />

            <Text style={styles.label}>Required Score (%)</Text>
            <TextInput style={styles.input} placeholder="70" value={requiredScore} onChangeText={setRequiredScore} keyboardType="numeric" editable={!saving} />

            <View style={styles.studentHeader}>
              <Text style={styles.label}>Assign To Students</Text>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectAll}>Select All</Text>
              </TouchableOpacity>
            </View>
            {students.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.studentRow, selectedStudents.has(s.id) && styles.studentRowActive]}
                onPress={() => toggleStudent(s.id)}
              >
                <Text style={styles.studentCheck}>{selectedStudents.has(s.id) ? '☑' : '☐'}</Text>
                <Text style={styles.studentName}>{s.name ?? s.email ?? 'Student'}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Assignment</Text>}
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
  cardOverdue: { borderLeftColor: '#dc2626' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  overdueBadge: { backgroundColor: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardMaterial: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { fontSize: 12, color: '#374151', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  progressTrack: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#16a34a', borderRadius: 3 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#6b7280' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 4 },
  chipRow: { marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  selectAll: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4, backgroundColor: '#f9fafb', gap: 10 },
  studentRowActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  studentCheck: { fontSize: 18, color: '#2563eb' },
  studentName: { fontSize: 14, color: '#111827' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
