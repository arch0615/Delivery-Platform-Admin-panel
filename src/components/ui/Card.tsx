import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type CardProps = {
  className?: string
  children: ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border-base bg-surface shadow-card',
        className,
      )}
    >
      {children}
    </section>
  )
}

export type CardHeaderProps = {
  title: ReactNode
  description?: ReactNode
  /** Right-aligned actions - buttons, filters, a menu. */
  actions?: ReactNode
  className?: string
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-4 border-b border-border-base px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function CardBody({ className, children }: CardProps) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

export function CardFooter({ className, children }: CardProps) {
  return (
    <footer
      className={cn(
        'flex items-center justify-between gap-3 border-t border-border-base bg-surface-muted px-5 py-3',
        className,
      )}
    >
      {children}
    </footer>
  )
}
