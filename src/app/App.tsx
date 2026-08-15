import { RouterProvider } from 'react-router'

import { ThemeProvider } from '@/app/ThemeProvider'
import { router } from '@/app/router'

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
