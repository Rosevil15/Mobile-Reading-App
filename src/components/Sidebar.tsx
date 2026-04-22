import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import { AuthService } from '../services/auth.service'

interface SidebarProps {
  state: any
  navigation: any
  descriptors: any
  onLogout: () => void
  role: 'student' | 'teacher'
}

const STUDENT_ITEMS = [
  { label: 'Reading Materials', route: 'StudentHome', icon: '📚' },
  { label: 'My Progress', route: 'Profile', icon: '📊' },
]

const TEACHER_ITEMS = [
  { label: 'Dashboard', route: 'Dashboard', icon: '🏠' },
  { label: 'Add Material', route: 'AddMaterial', icon: '➕' },
]

export function Sidebar({ state, navigation, onLogout, role }: SidebarProps) {
  const items = role === 'teacher' ? TEACHER_ITEMS : STUDENT_ITEMS
  const activeRoute = state.routes[state.index]?.name

  async function handleLogout() {
    await AuthService.logout()
    onLogout()
  }

  return (
    <DrawerContentScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{role === 'teacher' ? '👩‍🏫' : '👨‍🎓'}</Text>
        </View>
        <Text style={styles.roleLabel}>{role === 'teacher' ? 'Teacher' : 'Student'}</Text>
      </View>

      {/* Nav items */}
      <View style={styles.nav}>
        {items.map((item) => {
          const isActive = activeRoute === item.route
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigation.navigate(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Logout */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e3a5f' },
  content: { flex: 1 },
  header: {
    padding: 24,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#2d5a8e',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2d5a8e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 28 },
  roleLabel: { fontSize: 14, color: '#93c5fd', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  nav: { padding: 12, flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  navItemActive: { backgroundColor: '#2563eb' },
  navIcon: { fontSize: 18 },
  navLabel: { fontSize: 15, color: '#bfdbfe', fontWeight: '500' },
  navLabelActive: { color: '#fff', fontWeight: '700' },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2d5a8e',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 12,
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: 15, color: '#fca5a5', fontWeight: '600' },
})
