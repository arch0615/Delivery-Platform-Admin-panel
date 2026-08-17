/*
 * Smoke test for the running dev server.
 *
 * A 200 from Vite proves nothing: it serves index.html for every path, so a
 * fully broken app still answers 200 on every route. This drives a real
 * browser and fails on any console error, page error, or missing content.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *   node scripts/smoke.mjs --shots   also writes screenshots to .screenshots/
 */

import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.argv.find((arg) => arg.startsWith('http')) ?? 'http://localhost:5173'
const takeShots = process.argv.includes('--shots')
const SHOT_DIR = '.screenshots'

const PASSWORD = 'Plataforma2026!'
const ADMIN_EMAIL = 'alex.ramirez@plataforma.mx'

/** Expected text proves React actually rendered, not just that HTML was served. */
const ROUTES = [
  { path: '/', expect: 'Avance de construcción', shot: 'home' },
  { path: '/ops/orders', expect: 'Pedidos en vivo', shot: 'ops-orders' },
  { path: '/finance/payouts', expect: 'Dispersiones', shot: null },
  { path: '/compliance/blackouts', expect: 'Ley seca', shot: null },
  { path: '/settings/markets', expect: 'Ciudad de México', shot: 'markets' },
  { path: '/settings/zones', expect: 'Centro Histórico', shot: 'zones' },
  { path: '/catalog/verticals', expect: 'Restaurantes', shot: 'verticals' },
  { path: '/catalog/categories', expect: 'Mexicana', shot: 'categories' },
  { path: '/catalog/restricted-items', expect: 'tabaco', shot: null },
  { path: '/settings/roles', expect: 'Administrador general', shot: 'roles' },
  { path: '/settings/users', expect: 'alex.ramirez@plataforma.mx', shot: 'admin-users' },
  { path: '/settings/platform', expect: 'Pago en efectivo', shot: 'platform-settings' },
  { path: '/audit-log', expect: 'role.update', shot: null },
  { path: '/ui', expect: 'Sistema de diseño', shot: 'ui-gallery' },
  { path: '/no-such-route', expect: 'Página no encontrada', shot: null },
]

const ROLE_CASES = [
  {
    email: ADMIN_EMAIL,
    visible: ['Finanzas', 'Cumplimiento', 'Plataforma'],
    hidden: [],
  },
  {
    email: 'sofia.nunez@plataforma.mx',
    visible: ['Soporte', 'Comercios'],
    hidden: ['Finanzas', 'Plataforma'],
    shot: 'sidebar-support',
  },
  {
    email: 'mario.beltran@plataforma.mx',
    visible: ['Finanzas', 'Precios'],
    hidden: ['Cumplimiento', 'Soporte'],
  },
]

const IGNORED = [/Download the React DevTools/i]

function isIgnored(text) {
  return IGNORED.some((pattern) => pattern.test(text))
}

let failures = 0

function report(name, problems) {
  if (problems.length > 0) {
    failures += 1
    console.log(`FAIL  ${name}`)
    for (const problem of problems) {
      console.log(`        ${problem}`)
    }
  } else {
    console.log(`ok    ${name}`)
  }
}

/** Attaches console/page error collection to a page. */
function watch(page) {
  const problems = []

  page.on('console', (message) => {
    if (message.type() === 'error' && !isIgnored(message.text())) {
      problems.push(`console.error: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`)
  })

  return problems
}

/**
 * Completes sign-in, including first-run TOTP enrolment.
 *
 * The development hint on the 2FA screens renders the code the enrolled secret
 * is producing right now, so the flow can be driven without an authenticator
 * app. Verification allows one step of drift, which covers a rollover between
 * reading the code and submitting it.
 */
async function signIn(page, email) {
  // Sessions persist in localStorage across pages in this browser context, so
  // drop any existing one first - otherwise /login redirects straight to the
  // app and there is no form to fill. Enrolments are kept, so the second
  // sign-in for an account exercises the code path rather than enrolment.
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('admin.auth.session')
  })

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })

  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.waitForURL(/\/login\/(2fa|enroll)/, { timeout: 15_000 })

  const readDevCode = async () => {
    // The code renders asynchronously (it is an async crypto call), starting
    // as a placeholder, so wait for six digits rather than reading too early.
    const codeElement = page.getByTestId('dev-totp-code')
    await codeElement.waitFor({ state: 'visible', timeout: 15_000 })

    await page.waitForFunction(
      () =>
        /^\d{6}$/.test(document.querySelector('[data-testid="dev-totp-code"]')?.textContent ?? ''),
      undefined,
      { timeout: 15_000 },
    )

    const text = await codeElement.textContent()
    const match = text?.match(/\d{6}/)
    if (!match) {
      throw new Error(`development code hint did not resolve (saw "${text}")`)
    }
    return match[0]
  }

  if (page.url().includes('/login/enroll')) {
    await page.waitForSelector('img[alt="Código QR de configuración"]', { timeout: 15_000 })
    await page.getByLabel('Código de 6 dígitos').fill(await readDevCode())
    await page.getByRole('button', { name: 'Activar y entrar' }).click()
  } else {
    await page.getByLabel('Código de 6 dígitos').fill(await readDevCode())
    await page.getByRole('button', { name: 'Verificar' }).click()
  }

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

if (takeShots) {
  await mkdir(SHOT_DIR, { recursive: true })
}

// ------------------------------------------------------------------ auth ---

{
  const page = await context.newPage()
  const problems = watch(page)

  // Every admin route must bounce to /login while signed out. The redirect
  // happens in React, which can run after networkidle on a cold dev server,
  // so wait for the URL rather than sampling it.
  const expectRedirectToLogin = async (from) => {
    await page.goto(`${baseUrl}${from}`, { waitUntil: 'domcontentloaded' })
    try {
      await page.waitForURL((url) => url.pathname === '/login', { timeout: 15_000 })
    } catch {
      problems.push(`expected ${from} to redirect to /login, landed on ${page.url()}`)
    }
  }

  await expectRedirectToLogin('/finance/payouts')
  // Two-factor cannot be skipped by going straight to the challenge.
  await expectRedirectToLogin('/login/2fa')

  if (takeShots) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })
    await page.screenshot({ path: `${SHOT_DIR}/login.png`, fullPage: true })
  }

  report('auth: routes are gated', problems)
  await page.close()
}

{
  // Lockout, on an address that matches no account so no real demo account is
  // left locked behind. Acceptance criterion for A-001.
  const page = await context.newPage()
  const problems = watch(page)

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await page.getByLabel('Correo electrónico').fill('nobody@plataforma.mx')
    await page.getByLabel('Contraseña').fill('wrong-password')
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.waitForTimeout(120)
  }

  const body = await page.textContent('body')
  if (!body?.includes('Cuenta bloqueada temporalmente')) {
    problems.push('expected the lockout message after 5 failed attempts')
  }

  if (takeShots) {
    await page.screenshot({ path: `${SHOT_DIR}/login-locked.png`, fullPage: true })
  }

  report('auth: locks out after 5 failed attempts', problems)
  await page.close()
}

{
  // First sign-in must land on enrolment, since 2FA is mandatory.
  const page = await context.newPage()
  const problems = watch(page)

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Continuar' }).click()

  try {
    await page.waitForURL(/\/login\/enroll/, { timeout: 15_000 })
    await page.waitForSelector('img[alt="Código QR de configuración"]', { timeout: 15_000 })

    if (takeShots) {
      await page.screenshot({ path: `${SHOT_DIR}/enroll-2fa.png`, fullPage: true })
    }
  } catch (error) {
    problems.push(`enrolment step failed: ${error.message}`)
  }

  report('auth: first sign-in requires 2FA enrolment', problems)
  await page.close()
}

// --------------------------------------------------------------- routes ---

{
  const page = await context.newPage()
  const problems = watch(page)

  try {
    await signIn(page, ADMIN_EMAIL)
  } catch (error) {
    problems.push(`sign-in failed: ${error.message}`)
  }

  report('auth: completes sign-in with a TOTP code', problems)

  if (takeShots) {
    await page.goto(`${baseUrl}/login/2fa`, { waitUntil: 'networkidle' })
  }
  await page.close()
}

for (const route of ROUTES) {
  const page = await context.newPage()
  const problems = watch(page)

  try {
    const response = await page.goto(`${baseUrl}${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    })

    if (!response || !response.ok()) {
      problems.push(`HTTP ${response ? response.status() : 'no response'}`)
    }

    // Wait for the text rather than sampling: data-backed screens resolve
    // their query after the first render, which is after networkidle.
    //
    // Matching on body text rather than a locator on purpose - getByText can
    // settle on a hidden <option> in the market selector and then wait forever
    // for it to become visible.
    try {
      await page.waitForFunction(
        (needle) => (document.body.innerText ?? '').includes(needle),
        route.expect,
        { timeout: 15_000 },
      )
    } catch {
      problems.push(`missing expected text: "${route.expect}"`)
    }

    if (takeShots && route.shot) {
      await page.screenshot({ path: `${SHOT_DIR}/${route.shot}.png`, fullPage: true })
    }
  } catch (error) {
    problems.push(`navigation failed: ${error.message}`)
  }

  report(route.path, problems)
  await page.close()
}

// ---------------------------------------------------------- permissions ---

/*
 * Permission filtering, checked in the rendered DOM.
 *
 * The unit tests cover the matching logic; this proves the sidebar acts on it.
 * Acceptance criterion for A-003: a support role sees no Finanzas group at
 * all, not a greyed-out one.
 */
for (const testCase of ROLE_CASES) {
  const page = await context.newPage()
  const problems = watch(page)

  try {
    await signIn(page, testCase.email)

    const sidebar = await page.locator('nav[aria-label="Navegación principal"]').textContent()

    for (const label of testCase.visible) {
      if (!sidebar?.includes(label)) {
        problems.push(`expected group "${label}" to be visible`)
      }
    }
    for (const label of testCase.hidden) {
      if (sidebar?.includes(label)) {
        problems.push(`expected group "${label}" to be hidden`)
      }
    }

    if (takeShots && testCase.shot) {
      await page.screenshot({ path: `${SHOT_DIR}/${testCase.shot}.png`, fullPage: true })
    }
  } catch (error) {
    problems.push(`role check failed: ${error.message}`)
  }

  report(`role: ${testCase.email}`, problems)
  await page.close()
}

// ------------------------------------------------------------ framework ---

/*
 * The resource framework, exercised on the Markets screen (A-011).
 *
 * Filters, sort and pagination must survive a reload, because operators share
 * URLs. That is the property worth testing in a browser: the unit tests cover
 * the query logic, but only a real navigation proves the URL round-trips.
 */
{
  const page = await context.newPage()
  const problems = watch(page)

  try {
    await signIn(page, ADMIN_EMAIL)
    await page.goto(`${baseUrl}/settings/markets`, { waitUntil: 'networkidle' })

    const rowCount = async () => page.locator('tbody tr').count()

    // The list query starts after the first render, so networkidle can fire
    // while the skeleton is still showing. Wait for an actual row.
    const waitForRows = async () => {
      await page.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 15_000 })
    }

    try {
      await waitForRows()
    } catch {
      problems.push('expected market rows to render')
    }

    // Search narrows, and lands in the URL.
    await page.getByPlaceholder('Buscar por nombre o código…').fill('bogota')
    await page.waitForFunction(() => window.location.search.includes('q=bogota'), undefined, {
      timeout: 10_000,
    })
    await page.waitForTimeout(600)

    // Accent-insensitive: "bogota" must find "Bogotá".
    const searchedBody = await page.textContent('tbody')
    if (!searchedBody?.includes('Bogotá')) {
      problems.push('accent-insensitive search did not match "Bogotá"')
    }

    // Reload: filters live in the URL, so they must survive it.
    await page.reload({ waitUntil: 'networkidle' })
    if (!page.url().includes('q=bogota')) {
      problems.push('search term did not survive a reload')
    }

    // A filter that matches nothing shows the "no matches" state, distinct
    // from "nothing exists yet". Wait for it rather than guessing at the
    // debounce plus request time.
    await page.getByPlaceholder('Buscar por nombre o código…').fill('zzzzzz')
    try {
      await page.getByText('Sin coincidencias').waitFor({ state: 'visible', timeout: 10_000 })
    } catch {
      problems.push('expected the filtered-empty state')
    }

    if (takeShots) {
      await page.screenshot({ path: `${SHOT_DIR}/markets-empty.png`, fullPage: true })
    }

    // Clear, then sort by a column and confirm it reaches the URL.
    // "Limpiar" is exact: the empty state also offers "Limpiar filtros".
    await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
    await page.waitForFunction(() => !window.location.search.includes('q='), undefined, {
      timeout: 10_000,
    })

    await page.getByRole('button', { name: /^Código/ }).click()
    await page.waitForFunction(() => window.location.search.includes('sort=code'), undefined, {
      timeout: 10_000,
    })

    // Pagination: 28 seeded markets over a page size of 25.
    await page.getByRole('button', { name: 'Página siguiente' }).click()
    await page.waitForFunction(() => window.location.search.includes('page=2'), undefined, {
      timeout: 10_000,
    })

    // 28 seeded markets over a page size of 25 leaves 3 on page 2. Wait for
    // the count: the URL changes before React refetches, so sampling straight
    // after the click still sees page 1.
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('tbody tr').length === 3,
        undefined,
        {
          timeout: 15_000,
        },
      )
    } catch {
      problems.push(`expected 3 rows on page 2 of 28, got ${await rowCount()}`)
    }
  } catch (error) {
    problems.push(`framework check failed: ${error.message}`)
  }

  report('framework: url-driven filters, sort and pagination', problems)
  await page.close()
}

{
  // Typed confirmation guards destructive actions.
  const page = await context.newPage()
  const problems = watch(page)

  try {
    await signIn(page, ADMIN_EMAIL)
    await page.goto(`${baseUrl}/settings/markets?q=merida`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    await page.getByRole('button', { name: 'Acciones' }).first().click()
    await page.getByRole('menuitem', { name: 'Eliminar' }).click()

    const confirmButton = page.getByRole('button', { name: 'Eliminar definitivamente' })
    await confirmButton.waitFor({ state: 'visible', timeout: 10_000 })

    if (!(await confirmButton.isDisabled())) {
      problems.push('confirm should stay disabled until the code is typed')
    }

    // Typing the wrong code must not enable it.
    await page.getByLabel(/Escribe "/).fill('WRONG')
    if (!(await confirmButton.isDisabled())) {
      problems.push('confirm enabled by an incorrect typed confirmation')
    }

    if (takeShots) {
      await page.screenshot({ path: `${SHOT_DIR}/typed-confirmation.png`, fullPage: true })
    }
  } catch (error) {
    problems.push(`confirmation check failed: ${error.message}`)
  }

  report('framework: destructive action needs typed confirmation', problems)
  await page.close()
}

// ----------------------------------------------------------- zone editor ---

/*
 * A-012 zone polygon editor.
 *
 * Clicks the map canvas directly and checks that the ring, its area and the
 * overlap warning all respond, then that the drawn zone saves. The geometry
 * itself is covered by unit tests; what only a browser can prove is that
 * clicks become vertices.
 *
 * CAVEAT: this does NOT verify that the polygon is painted on the map.
 * MapLibre parses GeoJSON sources on a web worker, and in headless Chromium
 * those tiles never materialise - a minimal, freshly created map with a single
 * GeoJSON source reports zero features too, so it is the environment and not
 * this application. Raster basemap tiles render fine because they are plain
 * images. Rendering has to be checked by eye in a real browser.
 */
{
  const page = await context.newPage()
  const problems = watch(page)

  try {
    await signIn(page, ADMIN_EMAIL)
    await page.goto(`${baseUrl}/settings/zones`, { waitUntil: 'networkidle' })
    await page.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 15_000 })

    await page.getByRole('button', { name: 'Nueva zona' }).click()

    const map = page.getByTestId('zone-map')
    await map.waitFor({ state: 'visible', timeout: 20_000 })
    // The WebGL canvas needs a frame before it accepts hit-testing.
    await page.waitForTimeout(1500)

    const box = await map.boundingBox()
    if (!box) {
      throw new Error('map has no bounding box')
    }

    // Draw a quadrilateral by clicking four corners inside the canvas.
    const corners = [
      [0.35, 0.35],
      [0.6, 0.35],
      [0.6, 0.6],
      [0.35, 0.6],
    ]

    for (const [fx, fy] of corners) {
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
      await page.waitForTimeout(250)
    }

    const panel = page.locator('aside')

    // Four clicks must become four points.
    const pointsText = await panel.getByText('Puntos').locator('..').textContent()
    if (!pointsText?.includes('4')) {
      problems.push(`expected 4 points after 4 clicks, panel read "${pointsText?.trim()}"`)
    }

    // With a closed ring the area readout must be a real figure, not a dash.
    const areaText = await panel.getByText('Área').locator('..').textContent()
    if (!areaText || !/km²/.test(areaText)) {
      problems.push(`expected an area in km², panel read "${areaText?.trim()}"`)
    }

    // Drawn over central CDMX, the ring should intersect the seeded zones.
    const panelText = await panel.textContent()
    if (!panelText?.includes('Se traslapa con')) {
      problems.push('expected an overlap warning against the seeded CDMX zones')
    }

    if (takeShots) {
      await page.screenshot({ path: `${SHOT_DIR}/zone-editor.png`, fullPage: false })
    }

    // Save requires a name; without one the button stays available but the
    // form refuses and reports why.
    await page.getByLabel('Nombre de la zona').fill('Zona de prueba')
    await page.getByRole('button', { name: 'Crear zona' }).click()

    // The list refetches after the editor closes, so wait for the new row.
    try {
      await page
        .locator('tbody')
        .getByText('Zona de prueba')
        .waitFor({ state: 'visible', timeout: 15_000 })
    } catch {
      problems.push('the drawn zone did not appear in the list after saving')
    }
  } catch (error) {
    problems.push(`zone editor check failed: ${error.message}`)
  }

  report('zones: draw a polygon, see area and overlap, save', problems)
  await page.close()
}

// -------------------------------------------------------- category tree ---

/*
 * A-017 category tree.
 *
 * The tree operations are unit-tested; what a browser adds is proof that the
 * buttons are wired to them and that the rendered hierarchy actually changes.
 */
{
  const page = await context.newPage()
  const problems = watch(page)

  try {
    await signIn(page, ADMIN_EMAIL)
    await page.goto(`${baseUrl}/catalog/categories`, { waitUntil: 'networkidle' })

    const rowNames = async () =>
      page
        .locator('ul > li')
        .evaluateAll((items) =>
          items.map((item) => item.querySelector('span > span')?.textContent?.trim() ?? ''),
        )

    await page.getByText('Mexicana').first().waitFor({ state: 'visible', timeout: 15_000 })

    const before = await rowNames()
    if (!before.includes('Mexicana') || !before.includes('Tacos')) {
      problems.push(`expected the seeded tree, saw ${JSON.stringify(before.slice(0, 6))}`)
    }

    // Collapsing a parent must hide its children.
    await page.getByRole('button', { name: 'Colapsar Mexicana' }).click()
    await page.waitForFunction(
      () => !(document.body.innerText ?? '').includes('Tortas y tortas ahogadas'),
      undefined,
      { timeout: 10_000 },
    )
    await page.getByRole('button', { name: 'Expandir Mexicana' }).click()
    await page.waitForFunction(
      () => (document.body.innerText ?? '').includes('Tortas y tortas ahogadas'),
      undefined,
      { timeout: 10_000 },
    )

    // Reorder two roots and confirm the order actually changes.
    const rootsBefore = await rowNames()
    const pizzaIndexBefore = rootsBefore.indexOf('Pizza')

    await page.getByRole('button', { name: 'Subir Pizza' }).click()
    await page.waitForTimeout(400)

    const rootsAfter = await rowNames()
    const pizzaIndexAfter = rootsAfter.indexOf('Pizza')

    if (!(pizzaIndexAfter < pizzaIndexBefore)) {
      problems.push(`"Subir" did not move Pizza up (${pizzaIndexBefore} -> ${pizzaIndexAfter})`)
    }

    // Nest it under the sibling above, then promote it back.
    await page.getByRole('button', { name: 'Anidar Pizza' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Promover Pizza' }).click()
    await page.waitForTimeout(400)

    const restored = await rowNames()
    if (restored.indexOf('Pizza') !== pizzaIndexAfter) {
      problems.push('indent followed by outdent did not restore the position')
    }

    // Switching vertical must swap the taxonomy entirely.
    await page.getByLabel('Vertical').selectOption({ label: 'Licores' })
    await page.getByText('Destilados').first().waitFor({ state: 'visible', timeout: 15_000 })

    const alcohol = await rowNames()
    if (alcohol.includes('Mexicana')) {
      problems.push('restaurant categories still visible after switching to Licores')
    }

    if (takeShots) {
      await page.screenshot({ path: `${SHOT_DIR}/categories-tree.png`, fullPage: true })
    }
  } catch (error) {
    problems.push(`category tree check failed: ${error.message}`)
  }

  report('categories: collapse, reorder, nest, switch vertical', problems)
  await page.close()
}

// ------------------------------------------------------- audit + settings ---

/*
 * A-015 flags and A-007 audit log.
 *
 * The claim under test is that a settings change is recorded. A flag toggle
 * writes an entry, so the log must show it - an audit trail that only exists
 * on paper is worse than none, because it implies a completeness it lacks.
 */
{
  const page = await context.newPage()
  const problems = watch(page)

  try {
    await signIn(page, ADMIN_EMAIL)
    await page.goto(`${baseUrl}/settings/platform`, { waitUntil: 'networkidle' })
    await page
      .getByText('Entrega programada')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })

    // Toggling a flag must demand a reason before it applies.
    const row = page.locator('li').filter({ hasText: 'Entrega programada' })
    await row.getByRole('button', { name: 'Encender' }).click()

    const confirmButton = page.getByRole('button', { name: 'Encender', exact: true }).last()
    await page.getByLabel('Motivo').waitFor({ state: 'visible', timeout: 10_000 })

    if (!(await confirmButton.isDisabled())) {
      problems.push('flag confirmation should stay disabled until a reason is given')
    }

    await page.getByLabel('Motivo').fill('Prueba de humo: activación de entrega programada.')
    await confirmButton.click()

    await page.waitForFunction(
      () => !(document.body.innerText ?? '').includes('Motivo'),
      undefined,
      { timeout: 10_000 },
    )

    if (takeShots) {
      await page.screenshot({ path: `${SHOT_DIR}/platform-settings.png`, fullPage: true })
    }

    // The change must now appear in the audit log with its reason.
    //
    // Navigate IN-APP rather than with page.goto: the mock stores live in
    // module scope, so a reload resets them and the entry just written would
    // be gone. Real persistence arrives with the API.
    await page.getByRole('link', { name: 'Bitácora' }).click()
    await page.waitForURL(/\/audit-log/, { timeout: 15_000 })
    await page.waitForFunction(
      () => (document.body.innerText ?? '').includes('feature_flag.enable'),
      undefined,
      { timeout: 15_000 },
    )

    const logBody = await page.textContent('body')
    if (!logBody?.includes('Prueba de humo')) {
      problems.push('the audit entry did not record the reason given')
    }
    if (!logBody?.includes('Alex Ramírez')) {
      problems.push('the audit entry did not record who made the change')
    }

    if (takeShots) {
      await page.screenshot({ path: `${SHOT_DIR}/audit-log.png`, fullPage: true })
    }
  } catch (error) {
    problems.push(`settings/audit check failed: ${error.message}`)
  }

  report('platform: flag toggle needs a reason and is audited', problems)
  await page.close()
}

{
  // A-013: the wildcard role must not be editable or removable.
  const page = await context.newPage()
  const problems = watch(page)

  try {
    await signIn(page, ADMIN_EMAIL)
    await page.goto(`${baseUrl}/settings/roles`, { waitUntil: 'networkidle' })
    await page
      .getByText('Administrador general')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })

    const row = page.locator('tbody tr').filter({ hasText: 'Administrador general' })
    await row.getByRole('button', { name: 'Acciones' }).click()

    const deleteItem = page.getByRole('menuitem', { name: 'Eliminar rol' })
    await deleteItem.waitFor({ state: 'visible', timeout: 10_000 })

    const disabled = await deleteItem.getAttribute('data-disabled')
    const ariaDisabled = await deleteItem.getAttribute('aria-disabled')
    if (disabled === null && ariaDisabled !== 'true') {
      problems.push('deleting the protected super_admin role should be disabled')
    }

    if (takeShots) {
      await page.screenshot({ path: `${SHOT_DIR}/roles.png`, fullPage: true })
    }
  } catch (error) {
    problems.push(`roles check failed: ${error.message}`)
  }

  report('roles: the wildcard role is protected', problems)
  await page.close()
}

await browser.close()

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)

process.exit(failures === 0 ? 0 : 1)
