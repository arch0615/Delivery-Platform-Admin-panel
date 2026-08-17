/*
 * CATALOG TAXONOMY
 *
 * Placeholder store until the API exists. Mirrors `verticals`, `categories`
 * and `restricted_items` in database schema.txt §5.
 *
 * The taxonomy is platform-owned and shared across merchants, which is what
 * makes cross-merchant browsing and commission rules by category possible. A
 * merchant's own menu sections are a separate thing (merchant_menu_sections).
 */

export type FulfillmentModel = 'marketplace' | 'first_party'

export type Vertical = {
  id: string
  code: string
  name: string
  fulfillmentModel: FulfillmentModel
  isAgeRestricted: boolean
  /** Null unless age-restricted. 18 for alcohol in Mexico. */
  minAge: number | null
  requiresPrescription: boolean
  requiresLicense: boolean
  /** Grocery needs substitutions; a restaurant order does not. */
  supportsSubstitution: boolean
  sortOrder: number
  isActive: boolean
}

/*
 * NOTE ON SCOPE (open question Q1)
 *
 * description.txt lists "artículos para el hogar"; work milestone.txt lists
 * "farmacia" instead. Both are seeded so either answer is a flag change rather
 * than a migration, but pharmacy ships inactive: it is COFEPRIS-regulated and
 * needs prescription upload and pharmacist validation before it can be turned
 * on. Activating it is a scope decision, not a toggle.
 */
const VERTICAL_SEED: Vertical[] = [
  {
    id: 'v-restaurants',
    code: 'restaurants',
    name: 'Restaurantes',
    fulfillmentModel: 'marketplace',
    isAgeRestricted: false,
    minAge: null,
    requiresPrescription: false,
    requiresLicense: false,
    supportsSubstitution: false,
    sortOrder: 10,
    isActive: true,
  },
  {
    id: 'v-grocery',
    code: 'grocery',
    name: 'Súper',
    fulfillmentModel: 'marketplace',
    isAgeRestricted: false,
    minAge: null,
    requiresPrescription: false,
    requiresLicense: false,
    supportsSubstitution: true,
    sortOrder: 20,
    isActive: true,
  },
  {
    id: 'v-retail',
    code: 'retail',
    name: 'Tiendas',
    fulfillmentModel: 'marketplace',
    isAgeRestricted: false,
    minAge: null,
    requiresPrescription: false,
    requiresLicense: false,
    supportsSubstitution: true,
    sortOrder: 30,
    isActive: true,
  },
  {
    id: 'v-home',
    code: 'home',
    name: 'Hogar',
    fulfillmentModel: 'marketplace',
    isAgeRestricted: false,
    minAge: null,
    requiresPrescription: false,
    requiresLicense: false,
    supportsSubstitution: false,
    sortOrder: 40,
    isActive: true,
  },
  {
    // Operated directly by the client (description.txt), so first-party:
    // own inventory, own couriers, a different money flow to the marketplace.
    id: 'v-alcohol',
    code: 'alcohol',
    name: 'Licores',
    fulfillmentModel: 'first_party',
    isAgeRestricted: true,
    minAge: 18,
    requiresPrescription: false,
    requiresLicense: true,
    supportsSubstitution: false,
    sortOrder: 50,
    isActive: true,
  },
  {
    id: 'v-pharmacy',
    code: 'pharmacy',
    name: 'Farmacia',
    fulfillmentModel: 'marketplace',
    isAgeRestricted: false,
    minAge: null,
    requiresPrescription: true,
    requiresLicense: true,
    supportsSubstitution: false,
    sortOrder: 60,
    isActive: false,
  },
]

export type Category = {
  id: string
  verticalId: string
  parentId: string | null
  code: string
  name: string
  sortOrder: number
  isActive: boolean
}

let nextCategorySeq = 0

function category(
  verticalId: string,
  parentId: string | null,
  code: string,
  name: string,
  sortOrder: number,
  isActive = true,
): Category {
  nextCategorySeq += 1
  return {
    id: `c-${String(nextCategorySeq).padStart(3, '0')}`,
    verticalId,
    parentId,
    code,
    name,
    sortOrder,
    isActive,
  }
}

const CATEGORY_SEED: Category[] = (() => {
  const rows: Category[] = []

  // Restaurantes
  const mexicana = category('v-restaurants', null, 'mexicana', 'Mexicana', 10)
  rows.push(mexicana)
  rows.push(category('v-restaurants', mexicana.id, 'tacos', 'Tacos', 10))
  rows.push(category('v-restaurants', mexicana.id, 'tortas', 'Tortas y tortas ahogadas', 20))
  rows.push(category('v-restaurants', mexicana.id, 'antojitos', 'Antojitos', 30))
  rows.push(category('v-restaurants', null, 'pizza', 'Pizza', 20))
  rows.push(category('v-restaurants', null, 'sushi', 'Sushi', 30))
  rows.push(category('v-restaurants', null, 'burgers', 'Hamburguesas', 40))
  rows.push(category('v-restaurants', null, 'saludable', 'Saludable', 50))
  rows.push(category('v-restaurants', null, 'postres', 'Postres', 60))

  // Súper
  const frescos = category('v-grocery', null, 'frescos', 'Frescos', 10)
  rows.push(frescos)
  rows.push(category('v-grocery', frescos.id, 'frutas-verduras', 'Frutas y verduras', 10))
  rows.push(category('v-grocery', frescos.id, 'carnes', 'Carnes y aves', 20))
  rows.push(category('v-grocery', frescos.id, 'lacteos', 'Lácteos y huevo', 30))
  rows.push(category('v-grocery', null, 'despensa', 'Despensa', 20))
  rows.push(category('v-grocery', null, 'panaderia', 'Panadería', 30))
  rows.push(category('v-grocery', null, 'bebidas', 'Bebidas sin alcohol', 40))
  rows.push(category('v-grocery', null, 'limpieza', 'Limpieza del hogar', 50))

  // Tiendas
  rows.push(category('v-retail', null, 'electronica', 'Electrónica', 10))
  rows.push(category('v-retail', null, 'mascotas', 'Mascotas', 20))
  rows.push(category('v-retail', null, 'papeleria', 'Papelería', 30))

  // Hogar
  rows.push(category('v-home', null, 'muebles', 'Muebles', 10))
  rows.push(category('v-home', null, 'decoracion', 'Decoración', 20))
  rows.push(category('v-home', null, 'herramientas', 'Herramientas', 30))

  // Licores
  rows.push(category('v-alcohol', null, 'cerveza', 'Cerveza', 10))
  rows.push(category('v-alcohol', null, 'vinos', 'Vinos', 20))
  const destilados = category('v-alcohol', null, 'destilados', 'Destilados', 30)
  rows.push(destilados)
  rows.push(category('v-alcohol', destilados.id, 'tequila', 'Tequila', 10))
  rows.push(category('v-alcohol', destilados.id, 'mezcal', 'Mezcal', 20))
  rows.push(category('v-alcohol', destilados.id, 'whisky', 'Whisky', 30))
  rows.push(category('v-alcohol', null, 'preparados', 'Preparados', 40))

  // Farmacia - inactive with the vertical.
  rows.push(category('v-pharmacy', null, 'cuidado-personal', 'Cuidado personal', 10, false))
  rows.push(category('v-pharmacy', null, 'primeros-auxilios', 'Primeros auxilios', 20, false))
  rows.push(category('v-pharmacy', null, 'medicamentos', 'Medicamentos', 30, false))

  return rows
})()

export type RestrictedMatchType = 'sku' | 'keyword' | 'category'

export type RestrictedItem = {
  id: string
  /** Null applies to every market. */
  marketId: string | null
  /** Null applies to every vertical. */
  verticalId: string | null
  matchType: RestrictedMatchType
  matchValue: string
  reason: string
  createdAt: string
}

const RESTRICTED_SEED: RestrictedItem[] = [
  {
    id: 'r-001',
    marketId: null,
    verticalId: null,
    matchType: 'keyword',
    matchValue: 'tabaco',
    reason: 'Venta de tabaco no permitida en la plataforma.',
    createdAt: '2026-03-04T10:00:00Z',
  },
  {
    id: 'r-002',
    marketId: null,
    verticalId: null,
    matchType: 'keyword',
    matchValue: 'cigarro electrónico',
    reason: 'Prohibida la venta y distribución de vapeadores en México.',
    createdAt: '2026-03-04T10:05:00Z',
  },
  {
    id: 'r-003',
    marketId: null,
    verticalId: null,
    matchType: 'keyword',
    matchValue: 'arma',
    reason: 'Artículo prohibido por políticas de la plataforma.',
    createdAt: '2026-03-04T10:10:00Z',
  },
  {
    id: 'r-004',
    marketId: null,
    verticalId: 'v-pharmacy',
    matchType: 'category',
    matchValue: 'medicamentos',
    reason: 'Medicamentos controlados: requieren receta y validación de farmacéutico.',
    createdAt: '2026-04-11T09:00:00Z',
  },
  {
    id: 'r-005',
    marketId: null,
    verticalId: 'v-grocery',
    matchType: 'keyword',
    matchValue: 'alcohol',
    reason: 'El alcohol se vende únicamente en la vertical de licores, con control de edad.',
    createdAt: '2026-04-11T09:05:00Z',
  },
  {
    id: 'r-006',
    marketId: null,
    verticalId: null,
    matchType: 'keyword',
    matchValue: 'fuegos artificiales',
    reason: 'Material pirotécnico: transporte no permitido.',
    createdAt: '2026-05-02T12:00:00Z',
  },
]

// ------------------------------------------------------------- verticals ---

let verticals: Vertical[] = [...VERTICAL_SEED]

export function listVerticals(): readonly Vertical[] {
  return verticals
}

export function findVertical(id: string): Vertical | undefined {
  return verticals.find((entry) => entry.id === id)
}

export function upsertVertical(input: Vertical): void {
  const exists = verticals.some((entry) => entry.id === input.id)
  verticals = exists
    ? verticals.map((entry) => (entry.id === input.id ? input : entry))
    : [...verticals, input]
}

export function setVerticalActive(id: string, isActive: boolean): void {
  verticals = verticals.map((entry) => (entry.id === id ? { ...entry, isActive } : entry))
}

// ------------------------------------------------------------ categories ---

let categories: Category[] = [...CATEGORY_SEED]

export function listCategories(): readonly Category[] {
  return categories
}

export function findCategory(id: string): Category | undefined {
  return categories.find((entry) => entry.id === id)
}

export function replaceCategories(next: Category[]): void {
  categories = next
}

export function upsertCategory(input: Category): void {
  const exists = categories.some((entry) => entry.id === input.id)
  categories = exists
    ? categories.map((entry) => (entry.id === input.id ? input : entry))
    : [...categories, input]
}

/** Removes a category and everything beneath it. */
export function deleteCategoryTree(id: string, descendantIds: string[]): void {
  const doomed = new Set([id, ...descendantIds])
  categories = categories.filter((entry) => !doomed.has(entry.id))
}

export function createCategoryId(): string {
  return `c-${crypto.randomUUID().slice(0, 8)}`
}

// ------------------------------------------------------ restricted items ---

let restricted: RestrictedItem[] = [...RESTRICTED_SEED]

export function listRestrictedItems(): readonly RestrictedItem[] {
  return restricted
}

export function upsertRestrictedItem(input: RestrictedItem): void {
  const exists = restricted.some((entry) => entry.id === input.id)
  restricted = exists
    ? restricted.map((entry) => (entry.id === input.id ? input : entry))
    : [input, ...restricted]
}

export function deleteRestrictedItem(id: string): void {
  restricted = restricted.filter((entry) => entry.id !== id)
}

export function createRestrictedItemId(): string {
  return `r-${crypto.randomUUID().slice(0, 8)}`
}
