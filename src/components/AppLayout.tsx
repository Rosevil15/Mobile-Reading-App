import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  useWindowDimensions, Modal, SafeAreaView,
  Platform, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView,
} from 'react-native'
import { AuthService } from '../services/auth.service'
import { supabase } from '../services/supabase'

interface NavItem { label: string; icon: string; key: string }

const STUDENT_ITEMS: NavItem[] = [
  { label: 'Reading Materials', icon: '📚', key: 'StudentHome' },
  { label: 'Assignments', icon: '📋', key: 'Assignments' },
  { label: 'My Progress', icon: '📊', key: 'Profile' },
  { label: 'My Rewards', icon: '🏅', key: 'Rewards' },
]

const TEACHER_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: '🏠', key: 'Dashboard' },
  { label: 'Assignments', icon: '📋', key: 'Assignments' },
  { label: 'Quiz Builder', icon: '📝', key: 'QuizBuilder' },
  { label: 'Analytics', icon: '📊', key: 'Analytics' },
  { label: 'Leaderboard', icon: '🏆', key: 'Leaderboard' },
  { label: 'Add Material', icon: '➕', key: 'AddMaterial' },
]

interface AppLayoutProps {
  children: React.ReactNode
  role: 'student' | 'teacher'
  activeScreen: string
  title: string
  onNavigate: (screen: string) => void
  onLogout: () => void
}

export function AppLayout({ children, role, activeScreen, title, onNavigate, onLogout }: AppLayoutProps) {
  const { width } = useWindowDimensions()
  const isWide = Platform.OS === 'web' ? width >= 600 : false
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const items = role === 'teacher' ? TEACHER_ITEMS : STUDENT_ITEMS
  const headerBg = role === 'teacher' ? '#1e3a5f' : '#2563eb'

  useEffect(() => {
    AuthService.getSession().then((s) => {
      if (s) { setUserEmail(s.email); setUserId(s.userId) }
    })
  }, [])

  async function handleLogout() {
    await AuthService.logout()
    onLogout()
  }

  const SidebarContent = () => (
    <View style={styles.sidebar}>
      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => { setProfileOpen(true); setMenuOpen(false) }}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{userEmail ? userEmail[0].toUpperCase() : '?'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileEmail} numberOfLines={1}>{userEmail}</Text>
          <Text style={styles.profileRole}>{role === 'teacher' ? 'Teacher' : 'Student'}</Text>
        </View>
        <Text style={styles.profileEdit}>✏️</Text>
      </TouchableOpacity>

      <View style={styles.navItems}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, activeScreen === item.key && styles.navItemActive]}
            onPress={() => { onNavigate(item.key); setMenuOpen(false) }}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navLabel, activeScreen === item.key && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutLabel}>Logout</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        {!isWide && (
          <TouchableOpacity style={styles.hamburger} onPress={() => setMenuOpen(true)}>
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <View style={styles.body}>
        {isWide && <SidebarContent />}
        <View style={styles.content}>{children}</View>
      </View>

      {!isWide && (
        <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
            <View style={styles.mobileDrawer}>
              <SidebarContent />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <ProfileModal
        visible={profileOpen}
        email={userEmail}
        userId={userId}
        onClose={() => setProfileOpen(false)}
      />
    </SafeAreaView>
  )
}

function ProfileModal({ visible, email, userId, onClose }: {
  visible: boolean; email: string; userId: string; onClose: () => void
}) {
  const [name, setName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'password'>('info')

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
      Alert.alert('Success', 'Name updated.')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update name.')
    } finally { setSaving(false) }
  }

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) { Alert.alert('Error', 'Please fill in all fields.'); return }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return }
    if (newPassword.length < 6) { Alert.alert('Error', 'Min 6 characters.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword(''); setConfirmPassword('')
      Alert.alert('Success', 'Password changed.')
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to change password.')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Profile</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <Text style={styles.emailLabel}>Email</Text>
          <Text style={styles.emailValue}>{email}</Text>

          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, tab === 'info' && styles.tabActive]} onPress={() => setTab('info')}>
              <Text style={[styles.tabText, tab === 'info' && styles.tabTextActive]}>Edit Name</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'password' && styles.tabActive]} onPress={() => setTab('password')}>
              <Text style={[styles.tabText, tab === 'password' && styles.tabTextActive]}>Change Password</Text>
            </TouchableOpacity>
          </View>

          {tab === 'info' ? (
            <View>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput style={styles.input} placeholder="Enter your name" value={name} onChangeText={setName} editable={!saving} />
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveName} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Name</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput style={styles.input} placeholder="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} editable={!saving} />
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput style={styles.input} placeholder="Confirm password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} editable={!saving} />
              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleChangePassword} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  hamburger: { padding: 4 },
  hamburgerIcon: { fontSize: 22, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 220, backgroundColor: '#1e3a5f', paddingTop: 8, justifyContent: 'space-between' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#2d5a8e' },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileEmail: { fontSize: 12, color: '#e0f2fe', fontWeight: '500' },
  profileRole: { fontSize: 10, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileEdit: { fontSize: 14 },
  navItems: { flex: 1, padding: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4, gap: 10 },
  navItemActive: { backgroundColor: '#2563eb' },
  navIcon: { fontSize: 18 },
  navLabel: { fontSize: 14, color: '#bfdbfe', fontWeight: '500' },
  navLabelActive: { color: '#fff', fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#2d5a8e', gap: 10 },
  logoutIcon: { fontSize: 18 },
  logoutLabel: { fontSize: 14, color: '#fca5a5', fontWeight: '600' },
  content: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  mobileDrawer: { width: 260, backgroundColor: '#1e3a5f' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 18, color: '#6b7280', padding: 4 },
  emailLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  emailValue: { fontSize: 15, color: '#111827', fontWeight: '500', marginBottom: 16 },
  tabs: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f9fafb' },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 12 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
