import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut, ShieldCheck, TimerReset } from 'lucide-react'

import { useCurrentUser } from '@/app/session-context'
import { cn } from '@/lib/cn'
import { remainingRecoveryCodes } from '@/lib/auth/mock-auth'

const CONTENT_CLASSES =
  'z-50 min-w-60 rounded-lg border border-border-base bg-surface p-1 shadow-raised'

const ITEM_CLASSES =
  'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink outline-hidden ' +
  'data-highlighted:bg-surface-sunken'

export type UserMenuProps = {
  onTriggerIdleWarning: () => void
  onSignOut: () => void
}

export function UserMenu({ onTriggerIdleWarning, onSignOut }: UserMenuProps) {
  const { user, role } = useCurrentUser()

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')

  const recoveryLeft = remainingRecoveryCodes(user.email)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-surface-sunken">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
        >
          {initials}
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-xs font-medium text-ink">{user.name}</span>
          <span className="block text-[11px] text-ink-muted">{role.name}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-3.5 text-ink-subtle" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={CONTENT_CLASSES}>
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium text-ink">{user.name}</p>
            <p className="text-xs text-ink-muted">{user.email}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-subtle">
              <ShieldCheck aria-hidden="true" className="size-3 text-positive" />
              2FA activa · {recoveryLeft} códigos de recuperación
            </p>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border-base" />

          <DropdownMenu.Item className={ITEM_CLASSES} onSelect={onTriggerIdleWarning}>
            <TimerReset aria-hidden="true" className="size-3.5 text-ink-subtle" />
            Probar aviso de inactividad
          </DropdownMenu.Item>

          <DropdownMenu.Item className={cn(ITEM_CLASSES, 'text-danger')} onSelect={onSignOut}>
            <LogOut aria-hidden="true" className="size-3.5" />
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
