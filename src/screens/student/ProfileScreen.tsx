import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { AuthService } from '../../services/auth.service'
import { supabase } from '../../services/supabase'
import { ProgressRepo } from '../../repositories/progress.repo'
import type { ProgressRecord } from '../../types'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'
import { AppLayout } from '../../components/AppLayout'

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
}

const repo = new ProgressRepo()

export function ProfileScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const session = await AuthService.getSession()
      if (!session) return
      setEmail(session.email)
      const data = await repo.getByStudent(session.userId)
      if (!cancelled) { setRecords(data); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <AppLayout role="student" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ConnectivityIndicator />

      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{email ? email[0].toUpperCase() : '?'}</Text>
        </View>
        <Text style={styles.emailText}>{email}</Text>
        <Text style={styles.roleText}>Student</Text>
        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={() => setShowPasswordModal(true)}
          accessibilityRole="button"
        >
          <Text style={styles.changePasswordText}>🔒 Change Password</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Reading History</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : records.length === 0 ? (
        <View style={styles.center}><Text style={styles.emptyText}>No reading sessions yet.</Text></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ProgressCard record={item} />}
        />
      )}

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </AppLayout>
  )
}

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
  }

  async function handleChange() {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.'); return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.'); return
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.'); return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      Alert.alert('Success', 'Password changed successfully.', [
        { text: 'OK', onPress: () => { reset(); onClose() } }
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Change Password</Text>

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!saving}
          />

          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!saving}
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleChange}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Update Password</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose() }} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ProgressCard({ record }: { record: ProgressRecord }) {
  const date = record.sessionDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{record.materialTitle}</Text>
      <View style={styles.row}>
        <Stat label="Score" value={`${record.score}/100`} />
        <Stat label="Fluency" value={record.fluencyRating} />
        <Stat label="WPM" value={String(record.wordsPerMinute)} />
      </View>
      <Text style={styles.date}>{date}</Text>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileHeader: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1d4ed8',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  emailText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  roleText: { fontSize: 13, color: '#bfdbfe', marginTop: 4, marginBottom: 16 },
  changePasswordBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  changePasswordText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  emptyText: { fontSize: 16, color: '#6b7280' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  date: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 400,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, fontSize: 15, color: '#111827',
    backgroundColor: '#f9fafb', marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#2563eb', borderRadius: 8,
    paddingVertical: 13, alignItems: 'center', marginBottom: 10,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#6b7280', fontSize: 14 },
})
