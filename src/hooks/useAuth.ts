import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { FAMILY_EMAIL, supabase } from '../lib/supabase'

export interface Auth {
  session: Session | null
  /** True only until we know whether a stored session exists, to avoid a login flash. */
  checking: boolean
  signIn: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export function useAuth(): Auth {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setChecking(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  /** Resolves to an error message, or null when the sign-in succeeded. */
  const signIn = useCallback(async (password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: FAMILY_EMAIL,
      password,
    })
    if (!error) return null

    const message = error.message.toLowerCase()
    // Supabase returns the same generic error for a wrong password and an unknown
    // account, which is the right behaviour; just say it plainly.
    if (message.includes('invalid login credentials')) {
      return 'That password does not match. Try again.'
    }
    // What a dropped connection, an offline device, or a paused Supabase project
    // all look like from here.
    if (message.includes('failed to fetch') || message.includes('network')) {
      return 'Could not reach the server. Check your connection and try again.'
    }
    if (message.includes('too many requests') || error.status === 429) {
      return 'Too many attempts. Wait a minute, then try again.'
    }
    return error.message
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { session, checking, signIn, signOut }
}
