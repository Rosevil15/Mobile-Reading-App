import React, { useState } from 'react'
import { HomeScreen } from '../screens/student/HomeScreen'
import { ProfileScreen } from '../screens/student/ProfileScreen'
import { ReadingScreen } from '../screens/student/ReadingScreen'
import { RewardsScreen } from '../screens/student/RewardsScreen'
import type { ReadingMaterial } from '../types'

type Screen = 'StudentHome' | 'Profile' | 'Reading' | 'Rewards'

interface NavState {
  screen: Screen
  material: ReadingMaterial | null
  readingParams: any
}

interface StudentNavigatorProps { onLogout?: () => void }

export function StudentNavigator({ onLogout }: StudentNavigatorProps) {
  const [state, setState] = useState<NavState>({
    screen: 'StudentHome',
    material: null,
    readingParams: null,
  })

  function navigate(target: string, params?: any) {
    setState(prev => {
      const next = { ...prev, screen: target as Screen }
      if (target === 'Reading' && params?.material) {
        next.material = params.material
        next.readingParams = params
      }
      return next
    })
  }

  function goBack() { setState(prev => ({ ...prev, screen: 'StudentHome' })) }

  const { screen, material, readingParams } = state

  const titles: Record<Screen, string> = {
    StudentHome: 'Reading Materials',
    Profile: 'My Progress',
    Reading: material?.title ?? 'Reading',
    Rewards: 'My Rewards',
  }

  if (screen === 'Reading' && material) {
    return <ReadingScreen material={material} readingParams={readingParams} activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} onBack={goBack} />
  }
  if (screen === 'Profile') return <ProfileScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
  if (screen === 'Rewards') return <RewardsScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
  return <HomeScreen activeScreen={screen} title={titles[screen]} onNavigate={navigate} onLogout={onLogout ?? (() => {})} />
}
