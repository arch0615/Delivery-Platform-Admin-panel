import type { ReactNode } from 'react'

import { ThemeToggle } from '@/components/ThemeToggle'

export type AuthLayoutProps = {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/** Shared frame for the sign-in screens. Deliberately outside the app shell. */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-md bg-surface-inverted text-xs font-bold text-ink-inverted"
          >
            M
          </span>
          <span className="text-sm font-semibold text-ink">Panel Admin</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-6 pt-8 pb-16">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-border-base bg-surface px-7 py-7 shadow-card">
            <h1 className="text-lg font-semibold text-ink">{title}</h1>
            {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
            <div className="mt-5">{children}</div>
          </div>
          {footer ? <div className="mt-4">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
