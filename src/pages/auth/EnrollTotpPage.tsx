import { Copy, Download, ShieldCheck } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'

import { useSession } from '@/app/session-context'
import { Alert, Button, Field } from '@/components/ui'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { CodeInput } from '@/pages/auth/CodeInput'
import { DevCodeHint } from '@/pages/auth/DevCodeHint'
import { ISSUER } from '@/lib/auth/mock-auth'
import { buildOtpAuthUri, formatSecretForDisplay } from '@/lib/auth/totp'

/*
 * A-002 First-login enrolment.
 *
 * Two-factor is mandatory, so an admin without it is sent here rather than
 * being allowed in. The secret is persisted only after the user proves they
 * can generate a code from it - confirming a mis-scanned QR would otherwise
 * lock them out of their own account on the next sign-in.
 */
export function EnrollTotpPage() {
  const { status, pending, enrollmentDraft, confirmEnrollmentCode, cancelSignIn } = useSession()
  const navigate = useNavigate()

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savedCodes, setSavedCodes] = useState(false)

  const otpAuthUri =
    pending && enrollmentDraft
      ? buildOtpAuthUri({
          secret: enrollmentDraft.secret,
          accountName: pending.email,
          issuer: ISSUER,
        })
      : null

  useEffect(() => {
    if (!otpAuthUri) {
      return
    }

    let cancelled = false

    void QRCode.toDataURL(otpAuthUri, { width: 320, margin: 1 }).then((url) => {
      if (!cancelled) {
        setQrDataUrl(url)
      }
    })

    return () => {
      cancelled = true
    }
  }, [otpAuthUri])

  if (status === 'signed_in') {
    return <Navigate to="/" replace />
  }
  if (status !== 'enrolling' || !pending || !enrollmentDraft) {
    return <Navigate to="/login" replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)

    const ok = await confirmEnrollmentCode(code)

    setSubmitting(false)

    if (ok) {
      void navigate('/', { replace: true })
    } else {
      setInvalid(true)
      setCode('')
    }
  }

  const downloadCodes = () => {
    const body = [
      `${ISSUER} - códigos de recuperación`,
      pending.email,
      '',
      ...enrollmentDraft.recoveryCodes,
      '',
      'Cada código se puede usar una sola vez.',
    ].join('\n')

    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'codigos-recuperacion.txt'
    link.click()
    URL.revokeObjectURL(url)
    setSavedCodes(true)
  }

  return (
    <AuthLayout
      title="Configura la verificación en dos pasos"
      description="Es obligatoria para todas las cuentas administrativas."
      footer={<DevCodeHint secret={enrollmentDraft.secret} />}
    >
      <div className="grid gap-5">
        <ol className="grid gap-4">
          <li>
            <p className="text-sm font-medium text-ink">1. Escanea el código</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Con Google Authenticator, 1Password, Authy o similar.
            </p>

            <div className="mt-2.5 flex justify-center rounded-lg border border-border-base bg-white p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Código QR de configuración" className="size-40" />
              ) : (
                <div className="size-40 animate-pulse rounded bg-surface-sunken" />
              )}
            </div>

            <p className="mt-2 text-xs text-ink-muted">
              ¿Sin cámara? Escribe esta clave manualmente:
            </p>
            <div className="mt-1 flex items-center gap-2">
              {/* Wrap between groups, never inside one: a break mid-group is
                  read as a different character run and mistyped. */}
              <code className="min-w-0 flex-1 rounded bg-surface-sunken px-2 py-1.5 font-mono text-xs leading-relaxed break-words text-ink">
                {formatSecretForDisplay(enrollmentDraft.secret)}
              </code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                leadingIcon={<Copy aria-hidden="true" className="size-3.5" />}
                onClick={() => {
                  void navigator.clipboard.writeText(enrollmentDraft.secret)
                }}
              >
                Copiar
              </Button>
            </div>
          </li>

          <li>
            <p className="text-sm font-medium text-ink">2. Guarda tus códigos de recuperación</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Te permiten entrar si pierdes el teléfono. Se muestran una sola vez.
            </p>

            <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-lg border border-border-base bg-surface-muted p-3">
              {enrollmentDraft.recoveryCodes.map((recoveryCode) => (
                <code key={recoveryCode} className="font-mono text-xs text-ink">
                  {recoveryCode}
                </code>
              ))}
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2 w-full"
              leadingIcon={<Download aria-hidden="true" className="size-3.5" />}
              onClick={downloadCodes}
            >
              Descargar códigos
            </Button>

            {savedCodes ? (
              <Alert tone="positive" className="mt-2">
                Códigos descargados. Guárdalos en un lugar seguro.
              </Alert>
            ) : null}
          </li>
        </ol>

        <form
          onSubmit={(event) => void onSubmit(event)}
          className="grid gap-3 border-t border-border-base pt-5"
        >
          <p className="text-sm font-medium text-ink">3. Confirma con un código</p>

          {invalid ? (
            <Alert tone="danger" title="El código no coincide">
              Revisa que la hora del dispositivo esté sincronizada e inténtalo de nuevo.
            </Alert>
          ) : null}

          <Field label="Código de 6 dígitos">
            {({ id }) => (
              <CodeInput
                id={id}
                autoFocus
                invalid={invalid}
                value={code}
                onChange={(next) => {
                  setCode(next)
                  setInvalid(false)
                }}
              />
            )}
          </Field>

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={code.length !== 6}
            leadingIcon={<ShieldCheck aria-hidden="true" className="size-4" />}
          >
            Activar y entrar
          </Button>

          <button
            type="button"
            onClick={() => {
              cancelSignIn()
              void navigate('/login', { replace: true })
            }}
            className="text-center text-xs text-ink-muted hover:text-ink hover:underline"
          >
            Cancelar
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
