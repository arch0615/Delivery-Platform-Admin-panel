/*
 * Smoke test for the running dev server.
 *
 * A 200 from Vite proves nothing: it serves index.html for every path, so a
 * fully broken app still answers 200 on every route. This loads each route in
 * a real browser and fails on any console error, page error, or missing
 * expected content.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *   node scripts/smoke.mjs --shots   also writes screenshots to .screenshots/
 */

import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.argv.find((arg) => arg.startsWith('http')) ?? 'http://localhost:5173'
const takeShots = process.argv.includes('--shots')
const SHOT_DIR = '.screenshots'

/** Expected text proves React actually rendered, not just that HTML was served. */
const ROUTES = [
  { path: '/', expect: 'Avance de construcción', shot: 'home' },
  { path: '/ops/orders', expect: 'Pedidos en vivo', shot: 'ops-orders' },
  { path: '/finance/payouts', expect: 'Dispersiones', shot: 'finance-payouts' },
  { path: '/compliance/blackouts', expect: 'Ley seca', shot: null },
  { path: '/settings/zones', expect: 'Zonas', shot: null },
  { path: '/ui', expect: 'Sistema de diseño', shot: 'ui-gallery' },
  { path: '/no-such-route', expect: 'Página no encontrada', shot: null },
]

// React logs recoverable issues we do not want to fail the build over.
const IGNORED = [/Download the React DevTools/i]

function isIgnored(text) {
  return IGNORED.some((pattern) => pattern.test(text))
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

if (takeShots) {
  await mkdir(SHOT_DIR, { recursive: true })
}

let failures = 0

for (const route of ROUTES) {
  const page = await context.newPage()
  const problems = []

  page.on('console', (message) => {
    if (message.type() === 'error' && !isIgnored(message.text())) {
      problems.push(`console.error: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`)
  })

  const url = `${baseUrl}${route.path}`

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })

    if (!response || !response.ok()) {
      problems.push(`HTTP ${response ? response.status() : 'no response'}`)
    }

    const body = await page.textContent('body')
    if (!body || !body.includes(route.expect)) {
      problems.push(`missing expected text: "${route.expect}"`)
    }

    if (takeShots && route.shot) {
      await page.screenshot({ path: `${SHOT_DIR}/${route.shot}.png`, fullPage: true })
    }
  } catch (error) {
    problems.push(`navigation failed: ${error.message}`)
  }

  if (problems.length > 0) {
    failures += 1
    console.log(`FAIL  ${route.path}`)
    for (const problem of problems) {
      console.log(`        ${problem}`)
    }
  } else {
    console.log(`ok    ${route.path}`)
  }

  await page.close()
}

/*
 * Permission filtering, checked in the rendered DOM.
 *
 * The unit tests cover the matching logic; this proves the sidebar actually
 * acts on it. Acceptance criterion for A-003: a support role sees no Finanzas
 * group at all, not a greyed-out one.
 */
const ROLE_CASES = [
  { role: 'super_admin', visible: ['Finanzas', 'Cumplimiento', 'Plataforma'], hidden: [] },
  { role: 'support', visible: ['Soporte', 'Comercios'], hidden: ['Finanzas', 'Plataforma'] },
  { role: 'finance', visible: ['Finanzas', 'Precios'], hidden: ['Cumplimiento', 'Soporte'] },
]

for (const testCase of ROLE_CASES) {
  const page = await context.newPage()
  const problems = []

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.evaluate((role) => {
    localStorage.setItem('admin.session.role', role)
  }, testCase.role)
  await page.goto(baseUrl, { waitUntil: 'networkidle' })

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

  if (takeShots && testCase.role === 'support') {
    await page.screenshot({ path: `${SHOT_DIR}/sidebar-support.png`, fullPage: true })
  }

  if (problems.length > 0) {
    failures += 1
    console.log(`FAIL  role:${testCase.role}`)
    for (const problem of problems) {
      console.log(`        ${problem}`)
    }
  } else {
    console.log(`ok    role:${testCase.role}`)
  }

  // Leave the stored role as it was found, so a manual browser session is not
  // silently switched by running the smoke test.
  await page.evaluate(() => {
    localStorage.removeItem('admin.session.role')
  })
  await page.close()
}

await browser.close()

const totalChecks = ROUTES.length + ROLE_CASES.length

console.log(
  failures === 0
    ? `\nAll ${totalChecks} checks passed.`
    : `\n${failures} of ${totalChecks} checks failed.`,
)

process.exit(failures === 0 ? 0 : 1)
