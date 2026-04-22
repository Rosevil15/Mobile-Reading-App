import React from 'react'
import { useWindowDimensions } from 'react-native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { HomeScreen } from '../screens/student/HomeScreen'
import { ProfileScreen } from '../screens/student/ProfileScreen'
import { ReadingScreen } from '../screens/student/ReadingScreen'
import type { StudentStackParamList } from '../screens/student/HomeScreen'
import { Sidebar } from '../components/Sidebar'

const Drawer = createDrawerNavigator<StudentStackParamList>()

interface StudentNavigatorProps {
  onLogout?: () => void
}

export function StudentNavigator({ onLogout }: StudentNavigatorProps) {
  const { width } = useWindowDimensions()
  const isWide = width >= 768

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <Sidebar {...props} role="student" onLogout={onLogout ?? (() => {})} />
      )}
      screenOptions={{
        drawerType: isWide ? 'permanent' : 'front',
        drawerStyle: { width: 220 },
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        // Hide the default header right — sidebar handles navigation
        headerRight: undefined,
      }}
    >
      <Drawer.Screen
        name="StudentHome"
        component={HomeScreen}
        options={{ title: 'Reading Materials' }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Progress' }}
      />
      <Drawer.Screen
        name="Reading"
        component={ReadingScreen}
        options={{ title: 'Reading', drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  )
}
