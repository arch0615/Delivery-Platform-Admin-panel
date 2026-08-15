import { useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useCurrentUser } from '@/app/session-context'
import { Breadcrumbs } from '@/components/shell/Breadcrumbs'
import { ConnectionIndicator } from '@/components/shell/ConnectionIndicator'
import { IdleWarningDialog } from '@/components/shell/IdleWarningDialog'
import { MarketSelector } from '@/components/shell/MarketSelector'
import { Sidebar } from '@/components/shell/Sidebar'
import { UserMenu } from '@/components/shell/UserMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useIdleTimer } from '@/hooks/useIdleTimer'

/** Warning at 25 minutes, sign-out at 30 (web architecture.txt §6.1). */
const WARN_AFTER_MS = 25 * 60 * 1000
const SIGN_OUT_AFTER_MS = 30 * 60 * 1000

export function AppShell() {
  const { signOut: endSession } = useCurrentUser()
  const navigate = useNavigate()

  const signOut = useCallback(() => {
    endSession()
    void navigate('/login', { replace: true })
  }, [endSession, navigate])

  const idle = useIdleTimer({
    warnAfterMs: WARN_AFTER_MS,
    signOutAfterMs: SIGN_OUT_AFTER_MS,
    onSignOut: signOut,
  })

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-base bg-surface px-6">
          <Breadcrumbs />

          <div className="flex items-center gap-3">
            <ConnectionIndicator />
            <MarketSelector />
            <span aria-hidden="true" className="h-5 w-px bg-border-base" />
            <ThemeToggle />
            <UserMenu onTriggerIdleWarning={idle.triggerWarning} onSignOut={signOut} />
          </div>
        </header>

        {/* Only this region scrolls; the sidebar and header stay put. */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <IdleWarningDialog
        open={idle.warning}
        secondsRemaining={idle.secondsRemaining}
        onStayActive={idle.stayActive}
        onSignOutNow={signOut}
      />
    </div>
  )
}
