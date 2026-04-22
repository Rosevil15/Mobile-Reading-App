import React, { useState } from 'react'
import { DashboardScreen } from '../screens/teacher/DashboardScreen'
import { StudentDetailScreen } from '../screens/teacher/StudentDetailScreen'
import { AddMaterialScreen } from '../screens/teacher/AddMaterialScreen'

type Screen = 'Dashboard' | 'StudentDetail' | 'AddMaterial'

interface TeacherNavigatorProps {
  onLogout?: () => void
}

export function TeacherNavigator({ onLogout }: TeacherNavigatorProps) {
  const [screen, setScreen] = useState<Screen>('Dashboard')
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null)

  function navigate(target: string, params?: any) {
    if (target === 'StudentDetail' && params) {
      setSelectedStudent({ id: params.studentId, name: params.studentName })
    }
    setScreen(target as Screen)
  }

  function goBack() {
    setScreen('Dashboard')
  }

  const titles: Record<Screen, string> = {
    Dashboard: 'Teacher Dashboard',
    StudentDetail: selectedStudent?.name ?? 'Student Detail',
    AddMaterial: 'Add Reading Material',
  }

  if (screen === 'StudentDetail' && selectedStudent) {
    return (
      <StudentDetailScreen
        studentId={selectedStudent.id}
        studentName={selectedStudent.name}
        activeScreen={screen}
        title={titles[screen]}
        onNavigate={navigate}
        onLogout={onLogout ?? (() => {})}
        onBack={goBack}
      />
    )
  }

  if (screen === 'AddMaterial') {
    return (
      <AddMaterialScreen
        activeScreen={screen}
        title={titles[screen]}
        onNavigate={navigate}
        onLogout={onLogout ?? (() => {})}
        onBack={goBack}
      />
    )
  }

  return (
    <DashboardScreen
      activeScreen={screen}
      title={titles[screen]}
      onNavigate={navigate}
      onLogout={onLogout ?? (() => {})}
    />
  )
}
