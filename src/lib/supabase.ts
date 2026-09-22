import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** The shared address the family password belongs to. Never shown as an input. */
export const FAMILY_EMAIL = import.meta.env.VITE_FAMILY_EMAIL ?? ''

/**
 * True when the build actually carries Supabase settings. When it does not we want a
 * readable "this build was not configured" screen rather than a blank page and a
 * console error, since that is the most likely thing to go wrong on a first deploy.
 */
export const isConfigured = Boolean(url && anonKey && FAMILY_EMAIL)

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'abc-list-auth',
  },
})
