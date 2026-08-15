import { NavLink } from 'react-router'

import { useSession } from '@/app/session-context'
import { NAV_GROUPS, NAV_HOME } from '@/app/nav'
import { cn } from '@/lib/cn'

function itemClasses({ isActive }: { isActive: boolean }): string {
  return cn(
    'block rounded-md px-3 py-1.5 text-sm transition-colors',
    isActive
      ? 'bg-accent-soft font-medium text-accent'
      : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  )
}

export function Sidebar() {
  const { can } = useSession()

  // A group whose every item is denied disappears with the group heading. The
  // viewer never sees a door they cannot open.
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0)

  return (
    <nav
      aria-label="Navegación principal"
      className="flex h-full w-64 shrink-0 flex-col border-r border-border-base bg-surface"
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border-base px-4">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-md bg-surface-inverted text-xs font-bold text-ink-inverted"
        >
          M
        </span>
        <span className="text-sm font-semibold text-ink">Panel Admin</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {can(NAV_HOME.permission) ? (
          <NavLink to={NAV_HOME.path} end className={itemClasses}>
            {NAV_HOME.label}
          </NavLink>
        ) : null}

        {visibleGroups.map((group) => {
          const Icon = group.icon

          return (
            <div key={group.id} className="mt-5 first:mt-3">
              <p className="flex items-center gap-2 px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-ink-subtle uppercase">
                <Icon aria-hidden="true" className="size-3.5" />
                {group.label}
              </p>

              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavLink to={item.path} className={itemClasses}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-border-base px-4 py-3">
        <NavLink
          to="/ui"
          className="text-xs text-ink-subtle transition-colors hover:text-ink-muted"
        >
          Sistema de diseño
        </NavLink>
      </div>
    </nav>
  )
}
