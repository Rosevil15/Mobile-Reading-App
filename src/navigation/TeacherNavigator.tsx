import React from 'react'
import { TouchableOpacity, Text } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { DashboardScreen } from '../screens/teacher/DashboardScreen'
import { StudentDetailScreen } from '../screens/teacher/StudentDetailScreen'
import type { TeacherStackParamList } from '../screens/teacher/DashboardScreen'
import { AuthService } from '../services/auth.service'

const Stack = createNativeStackNavigator<TeacherStackParamList>()

interface TeacherNavigatorProps {
  onLogout?: () => void
}

export function TeacherNavigator({ onLogout }: TeacherNavigatorProps) {
  async function handleLogout() {
    await AuthService.logout()
    onLogout?.()
  }

  const LogoutButton = () => (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 12 }}>
      <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600' }}>Logout</Text>
    </TouchableOpacity>
  )

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Teacher Dashboard', headerRight: () => <LogoutButton /> }}
      />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={({ route }) => ({ title: route.params.studentName })}
      />
    </Stack.Navigator>
  )
}
