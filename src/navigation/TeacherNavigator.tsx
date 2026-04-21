import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { DashboardScreen } from '../screens/teacher/DashboardScreen'
import { StudentDetailScreen } from '../screens/teacher/StudentDetailScreen'
import type { TeacherStackParamList } from '../screens/teacher/DashboardScreen'

const Stack = createNativeStackNavigator<TeacherStackParamList>()

interface TeacherNavigatorProps {
  onLogout?: () => void
}

export function TeacherNavigator(_props: TeacherNavigatorProps) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'My Students' }}
      />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={({ route }) => ({ title: route.params.studentName })}
      />
    </Stack.Navigator>
  )
}
