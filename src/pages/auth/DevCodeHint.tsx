import { KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { generateTotp, secondsRemainingInStep } from '@/lib/auth/totp'

/*
 * DEVELOPMENT ONLY.
 *
 * Shows the code the enrolled secret is currently producing, so the sign-in
 * flow can be exercised without an authenticator app on a phone. This exists
 * because the secret is (temporarily) in the browser at all - once the server
 * holds it, showing a live code here is impossible, and this component goes
 * with the rest of mock-auth.
 */
export function DevCodeHint({ secret }: { secret: string }) {
  const [code, setCode] = useState('------')
  const [secondsLeft, setSecondsLeft] = useState(30)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const next = await generateTotp(secret)
      if (!cancelled) {
        setCode(next)
        setSecondsLeft(secondsRemainingInStep())
      }
    }

    void refresh()
    const interval = window.setInterval(() => void refresh(), 1000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [secret])

  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
        <KeyRound aria-hidden="true" className="size-3.5 text-ink-subtle" />
        Ayuda de desarrollo
      </p>
      <p className="mt-0.5 text-xs text-ink-muted">
        Código válido ahora. Desaparece cuando exista el servidor.
      </p>

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span
          data-testid="dev-totp-code"
          className="tabular font-mono text-xl tracking-[0.3em] text-ink"
        >
          {code}
        </span>
        <span className="tabular text-xs text-ink-subtle">se renueva en {secondsLeft}s</span>
      </div>
    </div>
  )
}
