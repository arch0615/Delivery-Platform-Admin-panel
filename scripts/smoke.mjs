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
  { path: '/settings/zones', expect: 'Zonas', shot: null },
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

  // Every admin route must bounce to /login while signed out.
  await page.goto(`${baseUrl}/finance/payouts`, { waitUntil: 'networkidle' })
  if (!page.url().endsWith('/login')) {
    problems.push(`expected redirect to /login, landed on ${page.url()}`)
  }

  // Two-factor cannot be skipped by going straight to the app.
  await page.goto(`${baseUrl}/login/2fa`, { waitUntil: 'networkidle' })
  if (!page.url().endsWith('/login')) {
    problems.push(`2fa without a challenge should bounce to /login, got ${page.url()}`)
  }

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

await browser.close()

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)

process.exit(failures === 0 ? 0 : 1)
