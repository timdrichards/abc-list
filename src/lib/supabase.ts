import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL

/**
 * Supabase renamed these keys in 2025: the browser-safe key is now the "publishable"
 * key (sb_publishable_...), and the old JWT-style "anon" key is deprecated at the end
 * of 2026. Prefer the new name, but keep reading the old one so an existing anon key
 * still works until it is swapped.
 */
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

/** The shared address the family password belongs to. Never shown as an input. */
export const FAMILY_EMAIL = import.meta.env.VITE_FAMILY_EMAIL ?? ''

/**
 * True when the build actually carries Supabase settings. When it does not we want a
 * readable "this build was not configured" screen rather than a blank page and a
 * console error, since that is the most likely thing to go wrong on a first deploy.
 */
export const isConfigured = Boolean(url && publishableKey && FAMILY_EMAIL)

export const supabase = createClient(
  url ?? 'http://localhost',
  publishableKey ?? 'publishable-key-not-set',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'abc-list-auth',
    },
  },
)
