/*
 * Markets.
 *
 * Placeholder store until GET /admin/markets exists. The shape matches the
 * `markets` table in database schema.txt §2 - every market-scoped query reads
 * the selected market from request context, never from a client-supplied body.
 *
 * The seed covers Mexico plus the international expansion named in the brief,
 * with only the Mexican markets live. That is what "global multi-market" costs
 * in practice: rows, not a second deployment.
 */

export type Market = {
  id: string
  code: string
  name: string
  countryCode: string
  currency: string
  timezone: string
  locale: string
  taxRegime: string
  isLive: boolean
  launchedAt: string | null
  createdAt: string
}

function market(
  index: number,
  code: string,
  name: string,
  countryCode: string,
  currency: string,
  timezone: string,
  taxRegime: string,
  isLive: boolean,
  launchedAt: string | null,
): Market {
  return {
    id: `0f1c5b1a-0000-4000-8000-${String(index).padStart(12, '0')}`,
    code,
    name,
    countryCode,
    currency,
    timezone,
    locale: countryCode === 'BR' ? 'pt-BR' : countryCode === 'US' ? 'en-US' : 'es-MX',
    taxRegime,
    isLive,
    launchedAt,
    createdAt: `2026-0${(index % 8) + 1}-1${index % 9}T12:00:00Z`,
  }
}

const SEED: Market[] = [
  market(
    1,
    'MX-CDMX',
    'Ciudad de México',
    'MX',
    'MXN',
    'America/Mexico_City',
    'MX_IVA',
    true,
    '2026-03-02T00:00:00Z',
  ),
  market(
    2,
    'MX-GDL',
    'Guadalajara',
    'MX',
    'MXN',
    'America/Mexico_City',
    'MX_IVA',
    true,
    '2026-04-13T00:00:00Z',
  ),
  market(
    3,
    'MX-MTY',
    'Monterrey',
    'MX',
    'MXN',
    'America/Monterrey',
    'MX_IVA',
    true,
    '2026-05-11T00:00:00Z',
  ),
  market(4, 'MX-TIJ', 'Tijuana', 'MX', 'MXN', 'America/Tijuana', 'MX_IVA', false, null),
  market(5, 'MX-PUE', 'Puebla', 'MX', 'MXN', 'America/Mexico_City', 'MX_IVA', false, null),
  market(6, 'MX-QRO', 'Querétaro', 'MX', 'MXN', 'America/Mexico_City', 'MX_IVA', false, null),
  market(7, 'MX-MER', 'Mérida', 'MX', 'MXN', 'America/Merida', 'MX_IVA', false, null),
  market(8, 'MX-CUN', 'Cancún', 'MX', 'MXN', 'America/Cancun', 'MX_IVA', false, null),
  market(9, 'MX-LEO', 'León', 'MX', 'MXN', 'America/Mexico_City', 'MX_IVA', false, null),
  market(
    10,
    'MX-SLP',
    'San Luis Potosí',
    'MX',
    'MXN',
    'America/Mexico_City',
    'MX_IVA',
    false,
    null,
  ),
  market(11, 'MX-CJS', 'Ciudad Juárez', 'MX', 'MXN', 'America/Ojinaga', 'MX_IVA', false, null),
  market(12, 'MX-CHI', 'Chihuahua', 'MX', 'MXN', 'America/Chihuahua', 'MX_IVA', false, null),
  market(13, 'MX-AGS', 'Aguascalientes', 'MX', 'MXN', 'America/Mexico_City', 'MX_IVA', false, null),
  market(14, 'MX-TOL', 'Toluca', 'MX', 'MXN', 'America/Mexico_City', 'MX_IVA', false, null),
  market(15, 'CO-BOG', 'Bogotá', 'CO', 'COP', 'America/Bogota', 'CO_IVA', false, null),
  market(16, 'CO-MDE', 'Medellín', 'CO', 'COP', 'America/Bogota', 'CO_IVA', false, null),
  market(17, 'CO-CLO', 'Cali', 'CO', 'COP', 'America/Bogota', 'CO_IVA', false, null),
  market(18, 'CL-SCL', 'Santiago', 'CL', 'CLP', 'America/Santiago', 'CL_IVA', false, null),
  market(19, 'PE-LIM', 'Lima', 'PE', 'PEN', 'America/Lima', 'PE_IGV', false, null),
  market(
    20,
    'AR-BUE',
    'Buenos Aires',
    'AR',
    'ARS',
    'America/Argentina/Buenos_Aires',
    'AR_IVA',
    false,
    null,
  ),
  market(21, 'AR-COR', 'Córdoba', 'AR', 'ARS', 'America/Argentina/Cordoba', 'AR_IVA', false, null),
  market(22, 'BR-SAO', 'São Paulo', 'BR', 'BRL', 'America/Sao_Paulo', 'BR_NFE', false, null),
  market(23, 'BR-RIO', 'Río de Janeiro', 'BR', 'BRL', 'America/Sao_Paulo', 'BR_NFE', false, null),
  market(24, 'CR-SJO', 'San José', 'CR', 'CRC', 'America/Costa_Rica', 'CR_IVA', false, null),
  market(25, 'GT-GUA', 'Guatemala', 'GT', 'GTQ', 'America/Guatemala', 'GT_IVA', false, null),
  market(
    26,
    'US-LAX',
    'Los Ángeles',
    'US',
    'USD',
    'America/Los_Angeles',
    'US_SALES_TAX',
    false,
    null,
  ),
  market(27, 'US-HOU', 'Houston', 'US', 'USD', 'America/Chicago', 'US_SALES_TAX', false, null),
  market(28, 'ES-MAD', 'Madrid', 'ES', 'EUR', 'Europe/Madrid', 'ES_IVA', false, null),
]

/** Mutable until the API exists. Replaced by server state, not by a store. */
let markets: Market[] = [...SEED]

export function listMarkets(): readonly Market[] {
  return markets
}

export function findMarket(id: string): Market | undefined {
  return markets.find((entry) => entry.id === id)
}

/** Markets an admin can currently act in - only live ones carry real traffic. */
export function liveMarkets(): Market[] {
  return markets.filter((entry) => entry.isLive)
}

export function upsertMarket(input: Market): Market {
  const index = markets.findIndex((entry) => entry.id === input.id)

  if (index === -1) {
    markets = [input, ...markets]
  } else {
    markets = markets.map((entry) => (entry.id === input.id ? input : entry))
  }

  return input
}

export function setMarketLive(id: string, isLive: boolean): void {
  markets = markets.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          isLive,
          launchedAt: isLive ? (entry.launchedAt ?? new Date().toISOString()) : entry.launchedAt,
        }
      : entry,
  )
}

export function deleteMarket(id: string): void {
  markets = markets.filter((entry) => entry.id !== id)
}

export function createMarketId(): string {
  return crypto.randomUUID()
}
