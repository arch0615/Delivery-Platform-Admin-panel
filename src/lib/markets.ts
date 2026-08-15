/*
 * Markets available to the signed-in admin.
 *
 * Placeholder data until GET /admin/markets exists. The shape matches the
 * `markets` table in database schema.txt §2 - every market-scoped query reads
 * the selected market from request context, never from a client-supplied body.
 */

export type Market = {
  id: string
  code: string
  name: string
  currency: string
  timezone: string
  locale: string
  isLive: boolean
}

export const MARKETS: Market[] = [
  {
    id: '0f1c5b1a-0000-4000-8000-000000000001',
    code: 'MX-CDMX',
    name: 'Ciudad de México',
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    locale: 'es-MX',
    isLive: true,
  },
  {
    id: '0f1c5b1a-0000-4000-8000-000000000002',
    code: 'MX-GDL',
    name: 'Guadalajara',
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    locale: 'es-MX',
    isLive: true,
  },
  {
    id: '0f1c5b1a-0000-4000-8000-000000000003',
    code: 'MX-TIJ',
    name: 'Tijuana',
    currency: 'MXN',
    timezone: 'America/Tijuana',
    locale: 'es-MX',
    isLive: false,
  },
]

export function findMarket(id: string): Market | undefined {
  return MARKETS.find((market) => market.id === id)
}
