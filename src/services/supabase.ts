import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client initialized with environment-variable-style placeholders.
 * Replace these values with your actual project URL and anon key,
 * or wire them through a build-time env solution (e.g. expo-constants, dotenv).
 *
 * Requirements: 1.1, 1.2
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Disable built-in storage; AuthService manages persistence via AsyncStorage
    persistSession: false,
    autoRefreshToken: false,
  },
})
