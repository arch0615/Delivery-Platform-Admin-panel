import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { NAV_HOME, findNavGroup, findNavItem } from '@/app/nav'

/**
 * Breadcrumbs derived from the navigation model, so a route can never drift
 * out of sync with its trail. Group names are labels, not links - a group has
 * no landing page of its own.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation()

  const item = findNavItem(pathname)
  const group = findNavGroup(pathname)

  if (!item || item.path === NAV_HOME.path) {
    return <span className="text-sm font-medium text-ink">{NAV_HOME.label}</span>
  }

  return (
    <nav aria-label="Ruta de navegación">
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link to={NAV_HOME.path} className="text-ink-muted transition-colors hover:text-ink">
            {NAV_HOME.label}
          </Link>
        </li>

        {group ? (
          <>
            <ChevronRight aria-hidden="true" className="size-3.5 text-ink-subtle" />
            <li className="text-ink-muted">{group.label}</li>
          </>
        ) : null}

        <ChevronRight aria-hidden="true" className="size-3.5 text-ink-subtle" />
        <li className="font-medium text-ink" aria-current="page">
          {item.label}
        </li>
      </ol>
    </nav>
  )
}
