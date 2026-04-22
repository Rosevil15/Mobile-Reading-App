import React, { useState } from 'react'
import { HomeScreen } from '../screens/student/HomeScreen'
import { ProfileScreen } from '../screens/student/ProfileScreen'
import { ReadingScreen } from '../screens/student/ReadingScreen'
import type { ReadingMaterial } from '../types'

type Screen = 'StudentHome' | 'Profile' | 'Reading'

interface StudentNavigatorProps {
  onLogout?: () => void
}

export function StudentNavigator({ onLogout }: StudentNavigatorProps) {
  const [screen, setScreen] = useState<Screen>('StudentHome')
  const [selectedMaterial, setSelectedMaterial] = useState<ReadingMaterial | null>(null)

  function navigate(target: string, params?: any) {
    if (target === 'Reading' && params?.material) {
      setSelectedMaterial(params.material)
    }
    setScreen(target as Screen)
  }

  function goBack() {
    setScreen('StudentHome')
  }

  const titles: Record<Screen, string> = {
    StudentHome: 'Reading Materials',
    Profile: 'My Progress',
    Reading: selectedMaterial?.title ?? 'Reading',
  }

  if (screen === 'Reading' && selectedMaterial) {
    return (
      <ReadingScreen
        material={selectedMaterial}
        activeScreen={screen}
        title={titles[screen]}
        onNavigate={navigate}
        onLogout={onLogout ?? (() => {})}
        onBack={goBack}
      />
    )
  }

  if (screen === 'Profile') {
    return (
      <ProfileScreen
        activeScreen={screen}
        title={titles[screen]}
        onNavigate={navigate}
        onLogout={onLogout ?? (() => {})}
      />
    )
  }

  return (
    <HomeScreen
      activeScreen={screen}
      title={titles[screen]}
      onNavigate={navigate}
      onLogout={onLogout ?? (() => {})}
    />
  )
}
