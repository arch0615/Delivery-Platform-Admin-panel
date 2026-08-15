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

## Project structure

```
src/
  app/        router, providers, application shell
  pages/      route components, one per screen in the page register
  index.css   Tailwind entry point and design tokens
  main.tsx    application entry point
```

Directories for `components/`, `features/`, and `lib/` are added as the steps
that need them land.

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

| Step | Scope                                       | Status |
| ---- | ------------------------------------------- | ------ |
| 1    | Project scaffold, tooling, routing skeleton | Done   |
| 2    | Theme layer and base components (A-006)     | Done   |
| 3    | App shell and navigation (A-003)            | Next   |
| 4    | Login and 2FA (A-001, A-002)                | —      |
| 5    | Resource framework (A-005)                  | —      |

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
