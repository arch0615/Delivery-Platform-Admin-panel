import type { Position, Ring } from '@/lib/geo'

/*
 * Delivery zones.
 *
 * Placeholder store until the API exists. Mirrors the `zones` table
 * (database schema.txt §2): a zone is the unit of coverage, fee configuration,
 * courier supply and alcohol sale windows.
 *
 * The schema column is MULTIPOLYGON. The editor works with a single outer ring
 * per zone, which covers every real delivery zone; multi-part zones and holes
 * are a later addition and the type is kept ready for them.
 */

export type Zone = {
  id: string
  marketId: string
  name: string
  boundary: Ring
  isActive: boolean
  /** Breaks the tie when zones overlap. Higher wins. */
  priority: number
  createdAt: string
}

const CDMX = '0f1c5b1a-0000-4000-8000-000000000001'
const GDL = '0f1c5b1a-0000-4000-8000-000000000002'
const MTY = '0f1c5b1a-0000-4000-8000-000000000003'

function zone(
  index: number,
  marketId: string,
  name: string,
  boundary: Ring,
  isActive: boolean,
  priority: number,
): Zone {
  return {
    id: `2b7d9c00-0000-4000-8000-${String(index).padStart(12, '0')}`,
    marketId,
    name,
    boundary,
    isActive,
    priority,
    createdAt: `2026-0${(index % 6) + 1}-0${(index % 8) + 1}T10:00:00Z`,
  }
}

const SEED: Zone[] = [
  zone(
    1,
    CDMX,
    'Centro Histórico',
    [
      [-99.15, 19.42],
      [-99.12, 19.42],
      [-99.12, 19.45],
      [-99.15, 19.45],
    ],
    true,
    10,
  ),
  zone(
    2,
    CDMX,
    'Roma – Condesa',
    [
      [-99.18, 19.4],
      [-99.15, 19.4],
      [-99.15, 19.43],
      [-99.18, 19.43],
    ],
    true,
    20,
  ),
  // Deliberately overlaps Roma - Condesa around -99.18..-99.17, so the editor
  // has a real overlap to warn about and priority has something to resolve.
  zone(
    3,
    CDMX,
    'Polanco',
    [
      [-99.2, 19.42],
      [-99.17, 19.42],
      [-99.17, 19.45],
      [-99.2, 19.45],
    ],
    true,
    30,
  ),
  zone(
    4,
    CDMX,
    'Coyoacán',
    [
      [-99.18, 19.33],
      [-99.14, 19.33],
      [-99.14, 19.37],
      [-99.18, 19.37],
    ],
    false,
    10,
  ),
  zone(
    5,
    GDL,
    'Centro Guadalajara',
    [
      [-103.36, 20.66],
      [-103.33, 20.66],
      [-103.33, 20.69],
      [-103.36, 20.69],
    ],
    true,
    10,
  ),
  zone(
    6,
    GDL,
    'Zapopan Norte',
    [
      [-103.42, 20.7],
      [-103.38, 20.7],
      [-103.38, 20.74],
      [-103.42, 20.74],
    ],
    false,
    10,
  ),
  zone(
    7,
    MTY,
    'Centro Monterrey',
    [
      [-100.33, 25.66],
      [-100.29, 25.66],
      [-100.29, 25.7],
      [-100.33, 25.7],
    ],
    true,
    10,
  ),
]

let zones: Zone[] = [...SEED]

export function listZones(): readonly Zone[] {
  return zones
}

export function zonesInMarket(marketId: string): Zone[] {
  return zones.filter((entry) => entry.marketId === marketId)
}

export function findZone(id: string): Zone | undefined {
  return zones.find((entry) => entry.id === id)
}

export function upsertZone(input: Zone): Zone {
  const exists = zones.some((entry) => entry.id === input.id)
  zones = exists ? zones.map((entry) => (entry.id === input.id ? input : entry)) : [input, ...zones]
  return input
}

export function setZoneActive(id: string, isActive: boolean): void {
  zones = zones.map((entry) => (entry.id === id ? { ...entry, isActive } : entry))
}

export function deleteZone(id: string): void {
  zones = zones.filter((entry) => entry.id !== id)
}

export function createZoneId(): string {
  return crypto.randomUUID()
}

/** Map centre when creating a zone in a market with none yet. */
export const MARKET_CENTERS: Record<string, Position> = {
  [CDMX]: [-99.14, 19.43],
  [GDL]: [-103.35, 20.68],
  [MTY]: [-100.31, 25.68],
}
