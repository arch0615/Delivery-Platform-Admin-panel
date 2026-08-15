import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useSession } from '@/app/session-context'
import { Alert, Button, Field, Input } from '@/components/ui'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { ACCOUNTS, DEMO_PASSWORD, MAX_FAILED_ATTEMPTS } from '@/lib/auth/mock-auth'
import { ROLES } from '@/lib/permissions'
import { formatDuration } from '@/lib/format'

/*
 * A-001 Admin login.
 *
 * Two-factor is mandatory, so a successful password check never signs anyone
 * in - it only advances to a code challenge or to enrolment.
 */

type FormError =
  | { kind: 'invalid'; attemptsRemaining: number }
  | { kind: 'locked'; unlockAt: number }
  | { kind: 'empty' }

export function LoginPage() {
  const { status, signIn } = useSession()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<FormError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [secondsUntilUnlock, setSecondsUntilUnlock] = useState(0)

  // Live countdown while the account is locked, so the user is not left
  // guessing when to try again.
  useEffect(() => {
    if (error?.kind !== 'locked') {
      return
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((error.unlockAt - Date.now()) / 1000))
      setSecondsUntilUnlock(remaining)
      if (remaining === 0) {
        setError(null)
      }
    }

    update()
    const interval = window.setInterval(update, 1000)
    return () => {
      window.clearInterval(interval)
    }
  }, [error])

  if (status === 'signed_in') {
    return <Navigate to="/" replace />
  }
  if (status === 'awaiting_code') {
    return <Navigate to="/login/2fa" replace />
  }
  if (status === 'enrolling') {
    return <Navigate to="/login/enroll" replace />
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      setError({ kind: 'empty' })
      return
    }

    setSubmitting(true)
    const result = signIn(email, password)
    setSubmitting(false)

    if (result.status === 'needs_code') {
      void navigate('/login/2fa')
    } else if (result.status === 'needs_enrollment') {
      void navigate('/login/enroll')
    } else if (result.status === 'locked') {
      setError({ kind: 'locked', unlockAt: result.unlockAt })
    } else {
      setError({ kind: 'invalid', attemptsRemaining: result.attemptsRemaining })
      setPassword('')
    }
  }

  const locked = error?.kind === 'locked'

  return (
    <AuthLayout
      title="Iniciar sesión"
      description="Panel administrativo de la plataforma."
      footer={<DemoAccounts onPick={setEmail} />}
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {error?.kind === 'invalid' ? (
          <Alert tone="danger" title="Credenciales incorrectas">
            {/*
              The same message covers an unknown email and a wrong password:
              distinguishing them would let an attacker enumerate accounts.
            */}
            Te{' '}
            {error.attemptsRemaining === 1
              ? 'queda 1 intento'
              : `quedan ${error.attemptsRemaining} intentos`}{' '}
            antes de bloquear la cuenta.
          </Alert>
        ) : null}

        {locked ? (
          <Alert tone="danger" title="Cuenta bloqueada temporalmente">
            Se superaron {MAX_FAILED_ATTEMPTS} intentos fallidos. Podrás intentar de nuevo en{' '}
            <span className="tabular font-medium">{formatDuration(secondsUntilUnlock)}</span>.
          </Alert>
        ) : null}

        {error?.kind === 'empty' ? (
          <Alert tone="warning">Escribe tu correo y contraseña.</Alert>
        ) : null}

        <Field label="Correo electrónico" required>
          {({ id }) => (
            <Input
              id={id}
              type="email"
              autoComplete="username"
              autoFocus
              disabled={locked}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
              }}
              placeholder="nombre@plataforma.mx"
            />
          )}
        </Field>

        <Field label="Contraseña" required>
          {({ id }) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              disabled={locked}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
              }}
            />
          )}
        </Field>

        <Button type="submit" variant="primary" loading={submitting} disabled={locked}>
          Continuar
        </Button>

        <p className="text-center text-xs text-ink-subtle">
          Se te pedirá un código de verificación en el siguiente paso.
        </p>
      </form>
    </AuthLayout>
  )
}

/** Development affordance: replaces the temporary role switcher from step 3. */
function DemoAccounts({ onPick }: { onPick: (email: string) => void }) {
  return (
    <div className="rounded-lg border border-border-base bg-surface px-4 py-3">
      <p className="text-xs font-medium text-ink">Cuentas de prueba</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        Contraseña para todas: <code className="text-ink">{DEMO_PASSWORD}</code>
      </p>

      <ul className="mt-2 grid gap-0.5">
        {ACCOUNTS.map((account) => (
          <li key={account.id}>
            <button
              type="button"
              onClick={() => {
                onPick(account.email)
              }}
              className="flex w-full items-center justify-between gap-3 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-sunken"
            >
              <span className="truncate text-ink-muted">{account.email}</span>
              <span className="shrink-0 text-ink-subtle">{ROLES[account.roleCode].name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
