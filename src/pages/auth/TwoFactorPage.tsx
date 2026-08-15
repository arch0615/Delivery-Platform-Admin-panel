import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useSession } from '@/app/session-context'
import { Alert, Button, Field, Input } from '@/components/ui'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { CodeInput } from '@/pages/auth/CodeInput'
import { DevCodeHint } from '@/pages/auth/DevCodeHint'
import { getEnrollment, remainingRecoveryCodes } from '@/lib/auth/mock-auth'
import { formatDuration } from '@/lib/format'

/*
 * A-002 Two-factor challenge.
 *
 * Reachable only with a half-finished sign-in in state. Landing here directly
 * bounces back to /login, so the code step cannot be skipped.
 */

type CodeError =
  { kind: 'invalid'; attemptsRemaining: number } | { kind: 'locked'; unlockAt: number }

export function TwoFactorPage() {
  const { status, pending, submitCode, submitRecoveryCode, cancelSignIn } = useSession()
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [error, setError] = useState<CodeError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [secondsUntilUnlock, setSecondsUntilUnlock] = useState(0)

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
  if (status !== 'awaiting_code' || !pending) {
    return <Navigate to="/login" replace />
  }

  const locked = error?.kind === 'locked'
  const enrollment = getEnrollment(pending.email)
  const recoveryLeft = remainingRecoveryCodes(pending.email)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)

    const result = useRecovery ? submitRecoveryCode(code) : await submitCode(code)

    setSubmitting(false)

    if (result.status === 'ok') {
      void navigate('/', { replace: true })
      return
    }

    setCode('')

    if (result.status === 'locked') {
      setError({ kind: 'locked', unlockAt: result.unlockAt })
    } else {
      setError({ kind: 'invalid', attemptsRemaining: result.attemptsRemaining })
    }
  }

  return (
    <AuthLayout
      title="Verificación en dos pasos"
      description={`Hola ${pending.name.split(' ')[0] ?? pending.name}, confirma tu identidad para continuar.`}
      footer={enrollment && !useRecovery ? <DevCodeHint secret={enrollment.secret} /> : null}
    >
      <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4">
        {error?.kind === 'invalid' ? (
          <Alert tone="danger" title="Código incorrecto">
            Te{' '}
            {error.attemptsRemaining === 1
              ? 'queda 1 intento'
              : `quedan ${error.attemptsRemaining} intentos`}
            .
          </Alert>
        ) : null}

        {locked ? (
          <Alert tone="danger" title="Cuenta bloqueada temporalmente">
            Intenta de nuevo en{' '}
            <span className="tabular font-medium">{formatDuration(secondsUntilUnlock)}</span>.
          </Alert>
        ) : null}

        {useRecovery ? (
          <Field
            label="Código de recuperación"
            hint={`Cada código se usa una sola vez. Te quedan ${recoveryLeft}.`}
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                autoFocus
                disabled={locked}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value)
                }}
                placeholder="A1B2-C3D4"
                className="text-center font-mono tracking-widest uppercase"
              />
            )}
          </Field>
        ) : (
          <Field label="Código de 6 dígitos" hint="Ábrelo en tu aplicación de autenticación.">
            {({ id }) => (
              <CodeInput
                id={id}
                autoFocus
                disabled={locked}
                invalid={error?.kind === 'invalid'}
                value={code}
                onChange={setCode}
              />
            )}
          </Field>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={locked || code.length === 0}
        >
          Verificar
        </Button>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setUseRecovery((previous) => !previous)
              setCode('')
              setError(null)
            }}
            className="text-accent hover:underline"
          >
            {useRecovery ? 'Usar código de la app' : 'Usar código de recuperación'}
          </button>

          <button
            type="button"
            onClick={() => {
              cancelSignIn()
              void navigate('/login', { replace: true })
            }}
            className="text-ink-muted hover:text-ink hover:underline"
          >
            Usar otra cuenta
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}
