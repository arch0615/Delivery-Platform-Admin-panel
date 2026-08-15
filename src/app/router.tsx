import type { ReactElement } from 'react'
import { createBrowserRouter } from 'react-router'

import { NAV_GROUPS } from '@/app/nav'
import { MarketsPage } from '@/features/markets/MarketsPage'
import { RequireAuth } from '@/app/RequireAuth'
import { RequirePermission } from '@/app/RequirePermission'
import { AppShell } from '@/components/shell/AppShell'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { UiGalleryPage } from '@/pages/UiGalleryPage'
import { EnrollTotpPage } from '@/pages/auth/EnrollTotpPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { TwoFactorPage } from '@/pages/auth/TwoFactorPage'

/*
 * ROUTE TABLE
 *
 * Every navigable screen is generated from the navigation model in nav.ts, so
 * a route and its sidebar entry cannot drift apart. Each sits behind two
 * gates: RequireAuth (signed in, two-factor complete) and RequirePermission.
 */
/**
 * Screens that are built. Everything else falls back to a placeholder that
 * reports its ID and scheduled sprint, so clicking through the shell shows
 * exactly what is real.
 */
const BUILT_SCREENS: Record<string, ReactElement> = {
  '/settings/markets': <MarketsPage />,
}

const generatedRoutes = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    path: item.path,
    element: (
      <RequirePermission permission={item.permission}>
        {BUILT_SCREENS[item.path] ?? <PlaceholderPage />}
      </RequirePermission>
    ),
  })),
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/login/2fa',
    element: <TwoFactorPage />,
  },
  {
    path: '/login/enroll',
    element: <EnrollTotpPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <HomePage />,
          },
          ...generatedRoutes,
        ],
      },
      {
        // Living style guide, outside the shell so components are reviewed
        // without the surrounding chrome - but still behind auth.
        path: '/ui',
        element: <UiGalleryPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
