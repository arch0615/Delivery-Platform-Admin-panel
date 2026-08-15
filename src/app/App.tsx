import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RouterProvider } from 'react-router'

import { SessionProvider } from '@/app/SessionProvider'
import { ThemeProvider } from '@/app/ThemeProvider'
import { createQueryClient } from '@/app/query-client'
import { router } from '@/app/router'

export function App() {
  // Created once per app instance rather than at module scope, so tests and
  // fast refresh do not share a cache between mounts.
  const [queryClient] = useState(createQueryClient)

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
