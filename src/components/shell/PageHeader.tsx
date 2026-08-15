import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

/** Consistent page heading. Every screen uses it so titles never drift. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
