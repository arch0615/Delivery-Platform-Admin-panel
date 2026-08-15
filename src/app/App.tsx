import { RouterProvider } from 'react-router'

import { SessionProvider } from '@/app/SessionProvider'
import { ThemeProvider } from '@/app/ThemeProvider'
import { router } from '@/app/router'

export function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ThemeProvider>
  )
}
