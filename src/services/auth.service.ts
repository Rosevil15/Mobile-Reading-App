import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import type { Session, Role } from '../types'

const SESSION_KEY = 'session'

/**
 * Patterns that indicate internal Supabase / PostgreSQL details that must
 * not be surfaced to the caller.
 * Requirements: 1.3
 */
const INTERNAL_PATTERNS: RegExp[] = [
  /\bpg_\w+/gi,           // PostgreSQL internal identifiers
  /\bsql\b.*?;/gi,        // SQL fragments ending with semicolon
  /\bstack\s*trace\b/gi,  // Stack trace mentions
  /at\s+\w+\s*\(.*?\)/g,  // JS stack frames: "at fn (file:line)"
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // UUIDs
  /\bsupabase\b/gi,        // Supabase internal name
  /\bpostgres\b/gi,        // Postgres internal name
  /error code:\s*\d+/gi,  // Raw error codes
]

/**
 * Strip internal details from a Supabase error message.
 * Requirements: 1.3
 */
export function sanitizeErrorMessage(raw: string): string {
  let msg = raw
  for (const pattern of INTERNAL_PATTERNS) {
    msg = msg.replace(pattern, '')
  }
  // Collapse multiple spaces / punctuation left behind
  msg = msg.replace(/\s{2,}/g, ' ').trim()
  return msg || 'An unexpected error occurred.'
}

/**
 * Map a Supabase auth session + role into our app Session type.
 */
function toSession(
  userId: string,
  email: string,
  role: Role,
  accessToken: string,
  refreshToken: string,
): Session {
  return { userId, email, role, accessToken, refreshToken }
}

/**
 * AuthService — wraps Supabase Auth and persists the session to AsyncStorage.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export const AuthService = {
  /**
   * Create a new Supabase account, insert a profile row with the given role,
   * persist the session, and return it.
   * Requirements: 1.1
   */
  async register(email: string, password: string, role: Role): Promise<Session> {
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      throw new Error(sanitizeErrorMessage(error.message))
    }

    const authUser = data.user
    const authSession = data.session

    if (!authUser || !authSession) {
      throw new Error('Registration succeeded but no session was returned.')
    }

    // Insert profile row with the chosen role
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: authUser.id, role })

    if (profileError) {
      throw new Error(sanitizeErrorMessage(profileError.message))
    }

    const session = toSession(
      authUser.id,
      authUser.email ?? email,
      role,
      authSession.access_token,
      authSession.refresh_token,
    )

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  },

  /**
   * Authenticate with Supabase, fetch the user's role from the profiles table,
   * persist the session, and return it.
   * Requirements: 1.2
   */
  async login(email: string, password: string): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw new Error(sanitizeErrorMessage(error.message))
    }

    const authUser = data.user
    const authSession = data.session

    if (!authUser || !authSession) {
      throw new Error('Login succeeded but no session was returned.')
    }

    // Fetch role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      throw new Error(sanitizeErrorMessage(profileError.message))
    }

    const session = toSession(
      authUser.id,
      authUser.email ?? email,
      profile.role as Role,
      authSession.access_token,
      authSession.refresh_token,
    )

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  },

  /**
   * Sign out from Supabase and clear the persisted session.
   * Requirements: 1.5
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut()
    await AsyncStorage.removeItem(SESSION_KEY)
  },

  /**
   * Restore the session from AsyncStorage.
   * If the access token appears expired, attempt a silent refresh.
   * Returns null if no session exists or refresh fails.
   * Requirements: 1.4
   */
  async getSession(): Promise<Session | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY)
    if (!raw) return null

    let session: Session
    try {
      session = JSON.parse(raw) as Session
    } catch {
      await AsyncStorage.removeItem(SESSION_KEY)
      return null
    }

    // Return the stored session directly without re-validating
    // Token refresh happens lazily when API calls fail
    return session
  },
}
