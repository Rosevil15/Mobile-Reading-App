import { supabase } from './supabase'

export interface GamificationData {
  points: number
  streak: number
  stars: number  // derived from points
  badges: Badge[]
}

export interface Badge {
  key: string
  label: string
  icon: string
  description: string
}

// Badge definitions
export const BADGE_DEFINITIONS: Record<string, Badge> = {
  first_session:   { key: 'first_session',   icon: '🎯', label: 'First Steps',    description: 'Completed your first reading session' },
  streak_3:        { key: 'streak_3',         icon: '🔥', label: 'On Fire',        description: '3-day reading streak' },
  streak_7:        { key: 'streak_7',         icon: '⚡', label: 'Week Warrior',   description: '7-day reading streak' },
  score_80:        { key: 'score_80',         icon: '⭐', label: 'High Scorer',    description: 'Scored 80% or above' },
  score_100:       { key: 'score_100',        icon: '🏆', label: 'Perfect Score',  description: 'Scored 100%' },
  sessions_5:      { key: 'sessions_5',       icon: '📚', label: 'Bookworm',       description: 'Completed 5 reading sessions' },
  sessions_20:     { key: 'sessions_20',      icon: '🎓', label: 'Scholar',        description: 'Completed 20 reading sessions' },
  speed_reader:    { key: 'speed_reader',     icon: '💨', label: 'Speed Reader',   description: 'Read at 100+ words per minute' },
}

export function pointsToStars(points: number): number {
  if (points >= 500) return 5
  if (points >= 300) return 4
  if (points >= 150) return 3
  if (points >= 50)  return 2
  if (points >= 10)  return 1
  return 0
}

export const GamificationService = {
  async updateAfterSession(
    studentId: string,
    score: number,
    wpm: number,
    totalSessions: number
  ): Promise<{ newBadges: Badge[]; pointsEarned: number; newStreak: number }> {
    // Calculate points for this session
    const pointsEarned = Math.round(10 + (score / 10) + (wpm > 0 ? Math.min(wpm / 10, 10) : 0))

    // Get current gamification data
    const { data: current } = await supabase
      .from('gamification')
      .select('points, streak, last_session_date')
      .eq('student_id', studentId)
      .single()

    const today = new Date().toISOString().split('T')[0]
    const lastDate = current?.last_session_date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    let newStreak = 1
    if (lastDate === yesterdayStr) {
      newStreak = (current?.streak ?? 0) + 1
    } else if (lastDate === today) {
      newStreak = current?.streak ?? 1
    }

    const newPoints = (current?.points ?? 0) + pointsEarned

    // Upsert gamification row
    await supabase.from('gamification').upsert({
      student_id: studentId,
      points: newPoints,
      streak: newStreak,
      last_session_date: today,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' })

    // Check and award badges
    const { data: existingBadges } = await supabase
      .from('badges').select('badge_key').eq('student_id', studentId)
    const earned = new Set((existingBadges ?? []).map((b: any) => b.badge_key))

    const toAward: string[] = []
    if (!earned.has('first_session') && totalSessions >= 1) toAward.push('first_session')
    if (!earned.has('streak_3') && newStreak >= 3) toAward.push('streak_3')
    if (!earned.has('streak_7') && newStreak >= 7) toAward.push('streak_7')
    if (!earned.has('score_80') && score >= 80) toAward.push('score_80')
    if (!earned.has('score_100') && score >= 100) toAward.push('score_100')
    if (!earned.has('sessions_5') && totalSessions >= 5) toAward.push('sessions_5')
    if (!earned.has('sessions_20') && totalSessions >= 20) toAward.push('sessions_20')
    if (!earned.has('speed_reader') && wpm >= 100) toAward.push('speed_reader')

    if (toAward.length > 0) {
      await supabase.from('badges').insert(
        toAward.map((key) => ({ student_id: studentId, badge_key: key }))
      )
    }

    return {
      newBadges: toAward.map((k) => BADGE_DEFINITIONS[k]),
      pointsEarned,
      newStreak,
    }
  },

  async getStudentData(studentId: string): Promise<GamificationData> {
    const [{ data: gData }, { data: bData }] = await Promise.all([
      supabase.from('gamification').select('points, streak').eq('student_id', studentId).single(),
      supabase.from('badges').select('badge_key').eq('student_id', studentId),
    ])

    const points = gData?.points ?? 0
    const streak = gData?.streak ?? 0
    const badges = (bData ?? []).map((b: any) => BADGE_DEFINITIONS[b.badge_key]).filter(Boolean)

    return { points, streak, stars: pointsToStars(points), badges }
  },

  async getLeaderboard(teacherId: string): Promise<{ name: string; email: string; points: number; streak: number; stars: number }[]> {
    const { data: students } = await supabase
      .from('profiles').select('id, name, email').eq('teacher_id', teacherId)
    if (!students?.length) return []

    const ids = students.map((s: any) => s.id)
    const { data: gData } = await supabase
      .from('gamification').select('student_id, points, streak').in('student_id', ids)

    return students.map((s: any) => {
      const g = (gData ?? []).find((g: any) => g.student_id === s.id)
      const points = g?.points ?? 0
      return { name: s.name ?? s.email ?? 'Student', email: s.email, points, streak: g?.streak ?? 0, stars: pointsToStars(points) }
    }).sort((a, b) => b.points - a.points)
  },
}
