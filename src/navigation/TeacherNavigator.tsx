import React from 'react'
import { useWindowDimensions } from 'react-native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { DashboardScreen } from '../screens/teacher/DashboardScreen'
import { StudentDetailScreen } from '../screens/teacher/StudentDetailScreen'
import { AddMaterialScreen } from '../screens/teacher/AddMaterialScreen'
import type { TeacherStackParamList } from '../screens/teacher/DashboardScreen'
import { Sidebar } from '../components/Sidebar'

const Drawer = createDrawerNavigator<TeacherStackParamList>()

interface TeacherNavigatorProps {
  onLogout?: () => void
}

export function TeacherNavigator({ onLogout }: TeacherNavigatorProps) {
  const { width } = useWindowDimensions()
  const isWide = width >= 768

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <Sidebar {...props} role="teacher" onLogout={onLogout ?? (() => {})} />
      )}
      screenOptions={{
        drawerType: isWide ? 'permanent' : 'front',
        drawerStyle: { width: 220 },
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Teacher Dashboard' }}
      />
      <Drawer.Screen
        name="AddMaterial"
        component={AddMaterialScreen}
        options={{ title: 'Add Reading Material' }}
      />
      <Drawer.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={{ title: 'Student Detail', drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  )
}
