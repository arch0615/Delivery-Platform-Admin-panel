import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

import { useSession } from '@/app/session-context'
import { ConfirmDialog } from '@/framework/ConfirmDialog'
import type { ActionDef } from '@/framework/types'
import { cn } from '@/lib/cn'

const ITEM_CLASSES =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-hidden ' +
  'data-highlighted:bg-surface-sunken data-disabled:cursor-not-allowed data-disabled:opacity-50'

export type RowActionsProps<TRow> = {
  row: TRow
  actions: ActionDef<TRow>[]
  onCompleted: () => void
}

export function RowActions<TRow>({ row, actions, onCompleted }: RowActionsProps<TRow>) {
  const { can } = useSession()

  const [pending, setPending] = useState<ActionDef<TRow> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // An action the viewer cannot perform is absent, not disabled - the same
  // rule the sidebar follows.
  const visible = actions.filter(
    (action) => (!action.permission || can(action.permission)) && !(action.hidden?.(row) ?? false),
  )

  if (visible.length === 0) {
    return null
  }

  const runAction = async (action: ActionDef<TRow>, reason: string) => {
    setBusy(true)
    setError(null)

    try {
      await action.run(row, { reason })
      setPending(null)
      onCompleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la acción.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label="Acciones"
          onClick={(event) => {
            // The row itself may be clickable; opening the menu must not also
            // navigate into the record.
            event.stopPropagation()
          }}
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            onClick={(event) => {
              event.stopPropagation()
            }}
            className="z-50 min-w-48 rounded-lg border border-border-base bg-surface p-1 shadow-raised"
          >
            {visible.map((action) => {
              const disabledReason = action.disabled?.(row) ?? false

              return (
                <DropdownMenu.Item
                  key={action.id}
                  disabled={disabledReason !== false}
                  title={disabledReason === false ? undefined : disabledReason}
                  className={cn(
                    ITEM_CLASSES,
                    action.tone === 'danger' ? 'text-danger' : 'text-ink',
                  )}
                  onSelect={() => {
                    if (action.confirm) {
                      setError(null)
                      setPending(action)
                    } else {
                      void runAction(action, '')
                    }
                  }}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenu.Item>
              )
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {pending?.confirm ? (
        <ConfirmDialog
          open
          title={pending.confirm.title}
          description={pending.confirm.description(row)}
          {...(pending.confirm.consequence
            ? { consequence: pending.confirm.consequence(row) }
            : {})}
          confirmLabel={pending.confirm.confirmLabel}
          tone={pending.tone ?? 'default'}
          {...(pending.confirm.typedConfirmation
            ? { typedConfirmation: pending.confirm.typedConfirmation(row) }
            : {})}
          requireReason={pending.confirm.requireReason ?? false}
          busy={busy}
          error={error}
          onConfirm={(reason) => {
            void runAction(pending, reason)
          }}
          onCancel={() => {
            setPending(null)
            setError(null)
          }}
        />
      ) : null}
    </>
  )
}
