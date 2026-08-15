import { createBrowserRouter } from 'react-router'

import { NAV_GROUPS } from '@/app/nav'
import { RequirePermission } from '@/app/RequirePermission'
import { AppShell } from '@/components/shell/AppShell'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { UiGalleryPage } from '@/pages/UiGalleryPage'

/*
 * ROUTE TABLE
 *
 * Every navigable screen is generated from the navigation model in nav.ts, so
 * a route and its sidebar entry cannot drift apart. Each is wrapped in its
 * permission gate and currently renders a placeholder; real pages replace the
 * element as the sprint that owns them lands.
 */
const generatedRoutes = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    path: item.path,
    element: (
      <RequirePermission permission={item.permission}>
        <PlaceholderPage />
      </RequirePermission>
    ),
  })),
)

export const router = createBrowserRouter([
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
    // Living style guide, deliberately outside the shell so components are
    // reviewed without the surrounding chrome.
    path: '/ui',
    element: <UiGalleryPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
