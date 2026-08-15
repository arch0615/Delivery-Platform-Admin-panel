import { TimerReset } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui'
import { formatDuration } from '@/lib/format'

export type IdleWarningDialogProps = {
  open: boolean
  secondsRemaining: number
  onStayActive: () => void
  onSignOutNow: () => void
}

export function IdleWarningDialog({
  open,
  secondsRemaining,
  onStayActive,
  onSignOutNow,
}: IdleWarningDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // <dialog> gives focus trapping, inert background, and Escape handling for
  // free. Escape is intercepted below: dismissing must be deliberate.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="idle-warning-title"
      onCancel={(event) => {
        event.preventDefault()
      }}
      className="m-auto w-full max-w-sm rounded-xl border border-border-base bg-surface p-0 text-ink shadow-raised backdrop:bg-black/50"
    >
      <div className="px-6 py-6 text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-warning-soft text-warning">
          <TimerReset aria-hidden="true" className="size-5" />
        </span>

        <h2 id="idle-warning-title" className="mt-3 text-base font-semibold">
          Tu sesión está por expirar
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Por inactividad, se cerrará automáticamente en{' '}
          <span className="tabular font-medium text-ink">{formatDuration(secondsRemaining)}</span>.
        </p>

        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" onClick={onSignOutNow}>
            Cerrar sesión
          </Button>
          <Button variant="primary" onClick={onStayActive} autoFocus>
            Seguir conectado
          </Button>
        </div>
      </div>
    </dialog>
  )
}
