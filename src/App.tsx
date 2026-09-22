import { useState } from 'react'
import { Board } from './components/Board'
import { Archive } from './components/Archive'
import { Login } from './components/Login'
import { useAuth } from './hooks/useAuth'
import { useItems } from './hooks/useItems'
import { isConfigured } from './lib/supabase'

function NotConfigured() {
  return (
    <main className="notice">
      <h1>This build has no Supabase settings</h1>
      <p>
        The app was built without <code>VITE_SUPABASE_URL</code>,{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, or <code>VITE_FAMILY_EMAIL</code>.
      </p>
      <p>
        Locally, copy <code>.env.example</code> to <code>.env.local</code> and fill it in. For the
        deployed site, add all three as repository secrets and re-run the deploy workflow. The
        README walks through both.
      </p>
    </main>
  )
}

export default function App() {
  const { session, checking, signIn, signOut } = useAuth()
  const items = useItems(Boolean(session))
  const [archiveOpen, setArchiveOpen] = useState(false)

  if (!isConfigured) return <NotConfigured />

  if (checking) {
    return (
      <main className="splash" aria-busy="true">
        <p>Opening…</p>
      </main>
    )
  }

  if (!session) return <Login onSignIn={signIn} />

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <h1>ABC List</h1>
          <p>Today, this week, eventually.</p>
        </div>
        <div className="topbar__actions">
          <button type="button" onClick={() => setArchiveOpen(true)}>
            Archive
            {items.archive.length > 0 && <span className="pill">{items.archive.length}</span>}
          </button>
          <button
            type="button"
            className="topbar__signout"
            onClick={async () => {
              setArchiveOpen(false)
              await signOut()
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {items.error && (
        <p className="banner" role="alert">
          {items.error}{' '}
          <button type="button" onClick={() => void items.refresh()}>
            Retry
          </button>
        </p>
      )}

      {items.loading ? (
        <p className="splash" aria-busy="true">
          Loading your lists…
        </p>
      ) : (
        <Board items={items} />
      )}

      {archiveOpen && (
        <Archive
          items={items.archive}
          onRestore={items.restore}
          onDelete={items.remove}
          onClose={() => setArchiveOpen(false)}
        />
      )}
    </div>
  )
}
