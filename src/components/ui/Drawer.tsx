import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'

export type DrawerProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/**
 * Right-hand panel for detail and edit views.
 *
 * Built on <dialog>, which supplies focus trapping, an inert background and
 * Escape handling. Escape is allowed here - unlike a confirmation, closing an
 * edit panel is not a decision that needs deliberate intent.
 */
export function Drawer({ open, title, description, onClose, children, footer }: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
      aria-labelledby="drawer-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // text-left is explicit: a drawer opened from a right-aligned table cell
      // would otherwise inherit its alignment.
      className="ml-auto h-full max-h-none w-full max-w-md rounded-none border-l border-border-base bg-surface p-0 text-left text-ink shadow-raised backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border-base px-5 py-4">
          <div className="min-w-0">
            <h2 id="drawer-title" className="text-sm font-semibold">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <X aria-hidden="true" className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border-base bg-surface-muted px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  )
}
