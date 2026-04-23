import React, { useState } from 'react'
import { DashboardScreen } from '../screens/teacher/DashboardScreen'
import { StudentDetailScreen } from '../screens/teacher/StudentDetailScreen'
import { AddMaterialScreen } from '../screens/teacher/AddMaterialScreen'
import { AnalyticsScreen } from '../screens/teacher/AnalyticsScreen'
import { LeaderboardScreen } from '../screens/teacher/LeaderboardScreen'
import { AssignmentsScreen } from '../screens/teacher/AssignmentsScreen'

type Screen = 'Dashboard' | 'StudentDetail' | 'AddMaterial' | 'Analytics' | 'Leaderboard' | 'Assignments'

interface TeacherNavigatorProps {
  onLogout?: () => void
}

export function TeacherNavigator({ onLogout }: TeacherNavigatorProps) {
  const [screen, setScreen] = useState<Screen>('Dashboard')
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null)

  function navigate(target: string, params?: any) {
    if (target === 'StudentDetail' && params) setSelectedStudent({ id: params.studentId, name: params.studentName })
    setScreen(target as Screen)
  }

  function goBack() { setScreen('Dashboard') }

  const titles: Record<Screen, string> = {
    Dashboard: 'Teacher Dashboard',
    StudentDetail: selectedStudent?.name ?? 'Student Detail',
    AddMaterial: 'Add Reading Material',
    Analytics: 'Progress Analytics',
    Leaderboard: 'Leaderboard',
    Assignments: 'Assignments',
  }

  if (screen === 'StudentDetail' && selectedStudent) return <StudentDetailScreen studentId={selectedStudent.id} studentName={selectedStudent.name} activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} onBack={goBack} />
  if (screen === 'AddMaterial') return <AddMaterialScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} onBack={goBack} />
  if (screen === 'Analytics') return <AnalyticsScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
  if (screen === 'Leaderboard') return <LeaderboardScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
  if (screen === 'Assignments') return <AssignmentsScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
  return <DashboardScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
}
