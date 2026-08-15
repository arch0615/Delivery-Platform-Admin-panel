import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Alert, Button, Field, Input, Textarea } from '@/components/ui'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  /** Stated plainly before the operator commits - usually the money impact. */
  consequence?: ReactNode
  confirmLabel: string
  tone?: 'default' | 'danger'
  /** When set, the operator must type this exact string to enable confirm. */
  typedConfirmation?: string
  requireReason?: boolean
  busy?: boolean
  error?: string | null
  onConfirm: (reason: string) => void
  onCancel: () => void
}

/**
 * Confirmation for a resource action.
 *
 * Typed confirmation exists for actions that move money or cannot be undone.
 * A dialog people dismiss reflexively is not a control; making them type the
 * subject's name forces them to read which row they are acting on.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  consequence,
  confirmLabel,
  tone = 'default',
  typedConfirmation,
  requireReason = false,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      setTyped('')
      setReason('')
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const typedOk = typedConfirmation === undefined || typed.trim() === typedConfirmation
  const reasonOk = !requireReason || reason.trim().length >= 3
  const canConfirm = typedOk && reasonOk && !busy

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) {
          onCancel()
        }
      }}
      // text-left is explicit: the dialog is mounted inside the right-aligned
      // actions cell, and <dialog> still inherits text-align from its DOM
      // parent even while rendered in the top layer.
      className="m-auto w-full max-w-md rounded-xl border border-border-base bg-surface p-0 text-left text-ink shadow-raised backdrop:bg-black/50"
    >
      <div className="px-6 py-5">
        <div className="flex gap-3">
          {tone === 'danger' ? (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle aria-hidden="true" className="size-4.5" />
            </span>
          ) : null}

          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            <div className="mt-1 text-sm text-ink-muted">{description}</div>
          </div>
        </div>

        {consequence ? (
          <Alert tone={tone === 'danger' ? 'warning' : 'info'} className="mt-4">
            {consequence}
          </Alert>
        ) : null}

        {error ? (
          <Alert tone="danger" className="mt-3">
            {error}
          </Alert>
        ) : null}

        <div className="mt-4 grid gap-3">
          {requireReason ? (
            <Field label="Motivo" required hint="Queda registrado en la bitácora.">
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value)
                  }}
                  placeholder="Explica brevemente por qué."
                />
              )}
            </Field>
          ) : null}

          {typedConfirmation !== undefined ? (
            <Field label={`Escribe "${typedConfirmation}" para confirmar`} required>
              {({ id }) => (
                <Input
                  id={id}
                  autoFocus
                  value={typed}
                  onChange={(event) => {
                    setTyped(event.target.value)
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </Field>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={busy}
            disabled={!canConfirm}
            onClick={() => {
              onConfirm(reason.trim())
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
