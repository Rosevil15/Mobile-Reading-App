import React from 'react'
import { TouchableOpacity, Text, Alert } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { HomeScreen } from '../screens/student/HomeScreen'
import { ReadingScreen } from '../screens/student/ReadingScreen'
import { ProfileScreen } from '../screens/student/ProfileScreen'
import type { StudentStackParamList } from '../screens/student/HomeScreen'
import { AuthService } from '../services/auth.service'

const Stack = createNativeStackNavigator<StudentStackParamList>()

interface StudentNavigatorProps {
  onLogout?: () => void
}

export function StudentNavigator({ onLogout }: StudentNavigatorProps) {
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
        name="StudentHome"
        component={HomeScreen}
        options={{ title: 'Reading Materials', headerRight: () => <LogoutButton /> }}
      />
      <Stack.Screen
        name="Reading"
        component={ReadingScreen}
        options={({ route }) => ({ title: route.params.material.title })}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Progress' }}
      />
    </Stack.Navigator>
  )
}
