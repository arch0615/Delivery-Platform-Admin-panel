import { QueryClient } from '@tanstack/react-query'

/**
 * Server-state cache.
 *
 * Defaults are deliberately conservative for an operational tool: admin data
 * changes underneath the viewer constantly, and a stale table that looks live
 * is how an operator acts on an order that was already cancelled.
 *
 * Anything that decides money or access is never cached (web architecture.txt
 * §9); those screens set staleTime: 0 explicitly.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: {
        // Writes are never retried automatically. A retried refund or payout
        // is exactly what idempotency keys exist to prevent, and the client
        // must not create the situation on its own.
        retry: false,
      },
    },
  })
}
