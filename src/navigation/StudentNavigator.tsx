import React, { useState, useCallback } from 'react'
import { HomeScreen } from '../screens/student/HomeScreen'
import { ProfileScreen } from '../screens/student/ProfileScreen'
import { ReadingScreen } from '../screens/student/ReadingScreen'
import { RewardsScreen } from '../screens/student/RewardsScreen'
import { StudentAssignmentsScreen } from '../screens/student/AssignmentsScreen'
import type { ReadingMaterial } from '../types'

type Screen = 'StudentHome' | 'Profile' | 'Reading' | 'Rewards' | 'Assignments'

interface StudentNavigatorProps {
  onLogout?: () => void
}

export function StudentNavigator({ onLogout }: StudentNavigatorProps) {
  const [screen, setScreen] = useState<Screen>('StudentHome')
  const [selectedMaterial, setSelectedMaterial] = useState<ReadingMaterial | null>(null)
  const [readingParams, setReadingParams] = useState<any>(null)

  const navigate = useCallback((target: string, params?: any) => {
    if (target === 'Reading' && params?.material) {
      setSelectedMaterial(params.material)
      setReadingParams(params)
    }
    setScreen(target as Screen)
  }, [])

  const goBack = useCallback(() => setScreen('StudentHome'), [])

  const titles: Record<Screen, string> = {
    StudentHome: 'Reading Materials',
    Profile: 'My Progress',
    Reading: selectedMaterial?.title ?? 'Reading',
    Rewards: 'My Rewards',
    Assignments: 'My Assignments',
  }

  if (screen === 'Reading' && selectedMaterial) {
    return <ReadingScreen material={selectedMaterial} readingParams={readingParams} activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} onBack={goBack} />
  }
  if (screen === 'Profile') return <ProfileScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
  if (screen === 'Rewards') return <RewardsScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
  if (screen === 'Assignments') return <StudentAssignmentsScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
  return <HomeScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
}
