import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { HomeScreen } from '../screens/student/HomeScreen'
import { ReadingScreen } from '../screens/student/ReadingScreen'
import { ProfileScreen } from '../screens/student/ProfileScreen'
import type { StudentStackParamList } from '../screens/student/HomeScreen'

const Stack = createNativeStackNavigator<StudentStackParamList>()

interface StudentNavigatorProps {
  onLogout?: () => void
}

export function StudentNavigator(_props: StudentNavigatorProps) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StudentHome"
        component={HomeScreen}
        options={{ title: 'Reading Materials' }}
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
