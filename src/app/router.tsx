import { createBrowserRouter } from 'react-router'

import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/*
 * Route table for the admin panel.
 *
 * Routes are added step by step as their pages are built. The full 55-screen
 * register lives in "admin panel page list.txt"; the build order is in
 * "admin panel work schedule.txt".
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
