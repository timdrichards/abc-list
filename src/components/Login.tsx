import { useState } from 'react'

export function Login({ onSignIn }: { onSignIn: (password: string) => Promise<string | null> }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError(null)
    const message = await onSignIn(password)
    setBusy(false)
    if (message) {
      setError(message)
      setPassword('')
    }
  }

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__mark" aria-hidden="true">
          <span className="login__mark-a">A</span>
          <span className="login__mark-b">B</span>
          <span className="login__mark-c">C</span>
        </div>
        <h1>ABC List</h1>
        <p className="login__sub">Today, this week, eventually.</p>

        <label className="login__label" htmlFor="password">
          Family password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Open the board'}
        </button>

        <p className="login__note">
          This device stays signed in until you sign out.
        </p>
      </form>
    </main>
  )
}
