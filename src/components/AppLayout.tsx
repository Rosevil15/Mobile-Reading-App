import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native'
import { AuthService } from '../services/auth.service'

interface NavItem {
  label: string
  icon: string
  key: string
}

const STUDENT_ITEMS: NavItem[] = [
  { label: 'Reading Materials', icon: '📚', key: 'StudentHome' },
  { label: 'My Progress', icon: '📊', key: 'Profile' },
]

const TEACHER_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: '🏠', key: 'Dashboard' },
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

export function AppLayout({
  children,
  role,
  activeScreen,
  title,
  onNavigate,
  onLogout,
}: AppLayoutProps) {
  const { width } = useWindowDimensions()
  const isWide = Platform.OS === 'web' ? width >= 600 : false
  const [menuOpen, setMenuOpen] = useState(false)
  const items = role === 'teacher' ? TEACHER_ITEMS : STUDENT_ITEMS
  const headerBg = role === 'teacher' ? '#1e3a5f' : '#2563eb'

  async function handleLogout() {
    await AuthService.logout()
    onLogout()
  }

  const SidebarContent = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarIcon}>{role === 'teacher' ? '👩‍🏫' : '👨‍🎓'}</Text>
        <Text style={styles.sidebarRole}>
          {role === 'teacher' ? 'Teacher' : 'Student'}
        </Text>
      </View>
      <View style={styles.navItems}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, activeScreen === item.key && styles.navItemActive]}
            onPress={() => { onNavigate(item.key); setMenuOpen(false) }}
            accessibilityRole="button"
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        {!isWide && (
          <TouchableOpacity
            style={styles.hamburger}
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <View style={styles.body}>
        {/* Permanent sidebar on wide screens */}
        {isWide && <SidebarContent />}

        {/* Main content */}
        <View style={styles.content}>{children}</View>
      </View>

      {/* Mobile drawer modal */}
      {!isWide && (
        <Modal
          visible={menuOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setMenuOpen(false)}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          >
            <View style={styles.mobileDrawer}>
              <SidebarContent />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  hamburger: { padding: 4 },
  hamburgerIcon: { fontSize: 22, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 220,
    backgroundColor: '#1e3a5f',
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  sidebarHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2d5a8e',
    marginBottom: 8,
  },
  sidebarIcon: { fontSize: 36, marginBottom: 8 },
  sidebarRole: {
    fontSize: 12,
    color: '#93c5fd',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  navItems: { flex: 1, padding: 12 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
    gap: 10,
  },
  navItemActive: { backgroundColor: '#2563eb' },
  navIcon: { fontSize: 18 },
  navLabel: { fontSize: 14, color: '#bfdbfe', fontWeight: '500' },
  navLabelActive: { color: '#fff', fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d5a8e',
    gap: 10,
  },
  logoutIcon: { fontSize: 18 },
  logoutLabel: { fontSize: 14, color: '#fca5a5', fontWeight: '600' },
  content: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  mobileDrawer: { width: 260, backgroundColor: '#1e3a5f' },
})
