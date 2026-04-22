import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView,
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
  const [userId, setUserId] = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const session = await AuthService.getSession()
      if (!session) return
      setEmail(session.email)
      setUserId(session.userId)
      const data = await repo.getByStudent(session.userId)
      if (!cancelled) { setRecords(data); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <AppLayout role="student" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ConnectivityIndicator />

      {/* Header bar with Profile button */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Reading History</Text>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => setShowProfileModal(true)}
          accessibilityRole="button"
        >
          <Text style={styles.profileBtnText}>👤 Profile</Text>
        </TouchableOpacity>
      </View>

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

      <ProfileModal
        visible={showProfileModal}
        email={email}
        userId={userId}
        onClose={() => setShowProfileModal(false)}
      />
    </AppLayout>
  )
}

function ProfileModal({
  visible, email, userId, onClose,
}: {
  visible: boolean; email: string; userId: string; onClose: () => void
}) {
  const [name, setName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'password'>('info')

  // Load current name on open
  useEffect(() => {
    if (!visible || !userId) return
    supabase.from('profiles').select('name').eq('id', userId).single()
      .then(({ data }) => { if (data?.name) setName(data.name) })
  }, [visible, userId])

  async function handleSaveName() {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', userId)
      if (error) throw error
      Alert.alert('Success', 'Name updated successfully.')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update name.')
    } finally { setSaving(false) }
  }

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) { Alert.alert('Error', 'Please fill in all fields.'); return }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return }
    if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword(''); setConfirmPassword('')
      Alert.alert('Success', 'Password changed successfully.')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to change password.')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Email display */}
          <Text style={styles.emailLabel}>Email</Text>
          <Text style={styles.emailValue}>{email}</Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'info' && styles.tabActive]}
              onPress={() => setTab('info')}
            >
              <Text style={[styles.tabText, tab === 'info' && styles.tabTextActive]}>Edit Name</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'password' && styles.tabActive]}
              onPress={() => setTab('password')}
            >
              <Text style={[styles.tabText, tab === 'password' && styles.tabTextActive]}>Change Password</Text>
            </TouchableOpacity>
          </View>

          {tab === 'info' ? (
            <View>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                editable={!saving}
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveName}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Name</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!saving}
              />
              <Text style={styles.inputLabel}>Confirm Password</Text>
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
                onPress={handleChangePassword}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Update Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}
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
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  profileBtn: {
    backgroundColor: '#2563eb', borderRadius: 8,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  profileBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
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
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#6b7280' },
  emailLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  emailValue: { fontSize: 15, color: '#111827', fontWeight: '500', marginBottom: 16 },
  tabs: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f9fafb' },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, fontSize: 15, color: '#111827',
    backgroundColor: '#f9fafb', marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#2563eb', borderRadius: 8,
    paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
