import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type EmptyStateProps = {
  title: string
  description?: string
  /** Primary action - "create the first one", "clear the filters". */
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

/**
 * Every list screen needs three empty states, not one: nothing exists yet,
 * nothing matches the filters, and no permission to see it. This renders all
 * three - the caller decides which copy applies.
 */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {icon ? <div className="mb-3 text-ink-subtle">{icon}</div> : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
