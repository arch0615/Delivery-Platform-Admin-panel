# Panel Administrativo (APP-C)

Admin panel for the global multi-market delivery platform. Internal back-office
tool: merchant and courier lifecycle, live order operations, dispatch, pricing
and commissions, finance and settlement, and regulatory compliance.

Part of the web-first phase. See the planning documents in the parent folder:

| Document                        | Contents                                        |
| ------------------------------- | ----------------------------------------------- |
| `web feature analysis.txt`      | Feature breakdown and effort for all 3 web apps |
| `database schema.txt`           | PostgreSQL + PostGIS schema (95 tables)         |
| `web architecture.txt`          | System architecture, API design, security       |
| `admin panel work schedule.txt` | Sprint plan, page-by-page                       |
| `admin panel page list.txt`     | Route register (55 screens)                     |

## Requirements

- Node.js 22 LTS or newer
- npm 10 or newer

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173.

## Scripts

| Script                 | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the Vite dev server           |
| `npm run build`        | Type-check and build for production |
| `npm run preview`      | Serve the production build locally  |
| `npm run typecheck`    | Type-check without emitting         |
| `npm run lint`         | Run ESLint                          |
| `npm run lint:fix`     | Run ESLint with autofix             |
| `npm run format`       | Format `src/` with Prettier         |
| `npm run format:check` | Verify formatting without writing   |
| `npm test`             | Run unit tests once                 |
| `npm run test:watch`   | Run unit tests in watch mode        |
| `npm run smoke`        | Browser smoke test (needs `dev`)    |
| `npm run smoke:shots`  | Smoke test plus screenshots         |

## Project structure

```
src/
  app/              router, providers, session, navigation model
  components/
    shell/          sidebar, header, breadcrumbs, idle timeout
    ui/             design-system primitives
  hooks/            shared behaviour hooks
  lib/              formatters, permissions, class merging, seed data
  pages/            route components, one per screen in the page register
  index.css         Tailwind entry point and design tokens
scripts/            smoke test
```

`features/` is added when the first data-backed screen lands.

## Stack notes

- **TypeScript is pinned to 6.x, not 7.x.** `typescript-eslint` supports
  `<6.1.0`; TypeScript 7 currently has no lint support. Revisit once the lint
  toolchain catches up.
- **Tailwind CSS v4** is configured through the Vite plugin. There is no
  `tailwind.config.js`; tokens are declared with `@theme` in `src/index.css`.
- **Path alias**: `@/` resolves to `src/`, set in both `vite.config.ts` and
  `tsconfig.app.json`.
- The admin panel is a **desktop tool**. Layouts target 1280px and up; there is
  no mobile breakpoint work.

## Build progress

| Step | Scope                                        | Status |
| ---- | -------------------------------------------- | ------ |
| 1    | Project scaffold, tooling, routing skeleton  | Done   |
| 2    | Theme layer and base components (A-006)      | Done   |
| 3    | App shell and navigation (A-003, A-004)      | Done   |
| 4    | Login and 2FA (A-001, A-002)                 | Done   |
| 5    | Resource framework (A-005) + Markets (A-011) | Done   |
| 6    | Zone polygon editor (A-012)                  | Done   |
| 7    | Taxonomy (A-016, A-017, A-018)               | Done   |
| 8    | Roles, admin users, settings (A-013 … A-015) | Next   |

## Category tree (A-017)

The one taxonomy screen **not** built on the resource framework: it is a
hierarchy, not a filterable list, and flattening it into table rows would lose
the structure that gives it meaning. Per architecture risk AR3 that makes it a
deliberate exception rather than a drifting one.

`src/lib/tree.ts` holds the operations — build, flatten, indent, outdent,
reorder, reparent — against the flat `parent_id` + `sort_order` shape the schema
stores, so what the screen edits is exactly what the API will receive.

Two decisions worth knowing:

- **`canReparent` blocks moving a node into its own subtree.** That would
  detach the branch from the root and it would vanish from every listing.
- **Rows with a missing parent render as roots, not dropped.** A filtered view
  must not hide records; swallowing orphans makes a data problem invisible.

Reordering is by button (up / down / indent / outdent) rather than drag and
drop. The operations are the hard part and are fully tested; the buttons are
keyboard accessible, and a drag gesture can be layered on later without
touching the logic.

## Zone editor (A-012)

`src/lib/geo.ts` holds the geometry: spherical area, point-in-polygon,
segment intersection, self-intersection and ring overlap. The server is the
authority on geometry — these exist so the editor can warn _before_ saving.

Two failures they prevent:

- **A self-intersecting ring** renders happily in the browser and is then
  rejected by PostGIS, so the zone silently fails to save.
- **An unnoticed overlap** silently reroutes orders. Overlaps are legal —
  `priority` breaks the tie — so the editor reports them rather than blocking.

MapLibre is loaded lazily: it is ~800 kB, and support and finance roles never
open a map. Set `VITE_MAP_TILE_URL` to a real tile provider — the default is
OpenStreetMap, which is fine for development but not for production traffic
under their tile usage policy.

### Verification caveat

The smoke test proves that clicks become vertices, that area and overlap
warnings respond, and that a drawn zone saves. It does **not** prove the
polygon is painted, because MapLibre parses GeoJSON on a web worker and those
tiles never materialise in headless Chromium — a minimal freshly created map
with one GeoJSON source reports zero features there too. Raster basemap tiles
render fine, being plain images. **Check the drawn outline by eye in a real
browser.**

## Resource framework

Most admin screens are the same shape: a filterable table, permission-gated
actions, a detail panel. `src/framework` declares that shape once, so the
remaining list screens are configuration rather than bespoke pages.

`src/features/markets/MarketsPage.tsx` is the reference implementation — the
whole Markets screen (A-011) below the edit drawer is one `defineResource`
call.

```ts
defineResource<Market>({
  key: 'markets',
  permission: 'platform.manage',
  columns: [...],      // sortable, hideable, with explicit CSV values
  filters: [...],      // select and boolean, rendered into the URL
  fetch: (query) => ..., // server-shaped: page, sort, filters in; rows + total out
  rowActions: [...],   // permission-gated, with confirmation rules
})
```

What comes for free:

- **Filters, sort and pagination live in the URL.** Operators share links, and
  the back button works. Any change other than paging resets to page 1.
- **All four list states**: loading skeleton, error with retry, "nothing exists
  yet", and "nothing matches your filters" — which are different messages.
- **Actions the viewer cannot perform are absent, not disabled**, matching the
  sidebar rule.
- **Destructive actions require typed confirmation.** The operator types the
  record's code to proceed, which forces them to read which row they are on. A
  dialog people dismiss reflexively is not a control.
- **CSV export** covers the filtered set, not the visible page, escapes values
  Excel would execute as formulas, and hands off to a queued job above
  `SYNC_EXPORT_LIMIT` rows rather than silently truncating.

Search is accent-insensitive: operators type "Bogota" and "Merida" mid-shift,
and a search that misses on accents reads as missing data.

Per architecture risk AR3, an admin screen that cannot be expressed here is a
design-review trigger, not a new hand-built page.

### Known follow-up

The main bundle is ~178 kB gzipped, with MapLibre split into a ~244 kB chunk
that only loads when the zone editor opens. Route-level code splitting is still
worth doing before the screen count grows much further.

## Authentication

Two-factor is **mandatory**. A correct password never signs anyone in — it only
advances to a code challenge, or to enrolment on a first sign-in. `RequireAuth`
treats a half-finished sign-in as signed out, so 2FA cannot be skipped by
typing a URL.

TOTP is implemented properly (RFC 6238, verified against the published test
vectors) rather than stubbed, so the enrolment QR works with a real
authenticator app. `src/lib/auth/totp.ts` mirrors what the server will do.

Policy, matching what the server will enforce:

| Rule             | Value                                               |
| ---------------- | --------------------------------------------------- |
| Failed attempts  | 5, then a 15-minute lockout                         |
| Unknown email    | Reported identically to a wrong password            |
| Recovery codes   | 8, single use, shown once at enrolment              |
| Secret persisted | Only after the user proves they can generate a code |

### Sign in during development

Demo accounts are listed on the login screen — one per role, all sharing the
password `Plataforma2026!`. On first sign-in you will be asked to enrol: either
scan the QR with an authenticator app, or use the **development code hint**
below the card, which shows the code the secret is currently producing.

**`src/lib/auth/mock-auth.ts` is not security.** Passwords are compared in
plaintext in the browser and the TOTP secret lives in `localStorage`. Both are
impossible in production, where the server holds the secret, hashes with
Argon2id, and enforces lockout somewhere the client cannot clear it. The whole
module, and the development code hint, are deleted when the API lands.

## Navigation and permissions

`src/app/nav.ts` is the single source of truth for the sidebar, the
breadcrumbs, and the route table — a route cannot drift out of sync with its
menu entry because both are generated from it.

Each entry declares the permission required to see it. A viewer without it does
not get a disabled link: **the item, and its group if empty, disappear
entirely.** Sign in as `sofia.nunez@plataforma.mx` (Soporte) to see it — 6 of
37 screens, and no Finanzas group at all.

Hiding is UX, not security. The server re-checks every permission on every
request; `RequirePermission` only catches arrivals by bookmark or stale role.

Until `GET /admin/me` exists, `SessionProvider` supplies the session with the
real value shape, reading it from the mock auth module.

## Testing

| Command               | What it covers                                         |
| --------------------- | ------------------------------------------------------ |
| `npm test`            | Unit tests (Vitest) — permission matching, nav filters |
| `npm run smoke`       | Loads every route in Chromium; fails on console errors |
| `npm run smoke:shots` | Same, plus screenshots to `.screenshots/`              |

The smoke test needs the dev server running. It exists because **a 200 from
Vite proves nothing** — Vite serves `index.html` for every path, so a
completely broken app still answers 200 everywhere. Only a real browser load
catches a render failure.

## Design system

A living style guide runs at [`/ui`](http://localhost:5173/ui) with a
light / dark / system toggle. Check a component there in both themes before
using it.

Two rules the component layer depends on:

1. **Semantic tokens only.** Use `bg-surface`, `text-ink-muted`, `border-border-base`.
   A raw palette class such as `bg-slate-200` inside a component is a bug — it
   will not respond to the theme.
2. **Money goes through `<Money>`, dates through `<DateTime>`.** Amounts are
   integer minor units plus a currency code; rates are basis points. Rendering
   `amount / 100` inline loses the currency, the locale rules, and the column
   alignment.
