import { Link } from 'react-router'

/*
 * Temporary scaffold landing page.
 *
 * This exists only to prove the toolchain is wired end to end. It is replaced
 * by the real app shell and dashboard (A-003 / A-086) in a later step.
 */

type StackItem = {
  name: string
  version: string
  note: string
}

const STACK: StackItem[] = [
  { name: 'React', version: '19.2', note: 'UI runtime' },
  { name: 'TypeScript', version: '6.0', note: 'strict mode, path aliases' },
  { name: 'Vite', version: '8.2', note: 'dev server and build' },
  { name: 'Tailwind CSS', version: '4.3', note: 'styling and design tokens' },
  { name: 'React Router', version: '8.3', note: 'routing' },
  { name: 'ESLint + Prettier', version: '10.8 / 3.9', note: 'lint and formatting' },
]

const NEXT_STEPS = [
  'Capa de tema y componentes base (A-006)',
  'Shell de la aplicación y navegación (A-003)',
  'Inicio de sesión y 2FA (A-001, A-002)',
  'Framework de recursos (A-005)',
]

export function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-900 px-8 py-7 text-white">
            <p className="font-mono text-xs tracking-[0.2em] text-slate-400 uppercase">
              APP-C · Paso 1
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Panel Administrativo</h1>
            <p className="mt-1 text-sm text-slate-300">
              Plataforma global de entregas multi-mercado — andamiaje del proyecto
            </p>
          </header>

          <section className="px-8 py-7">
            <h2 className="text-sm font-semibold text-slate-900">Stack configurado</h2>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {STACK.map((item) => (
                <li key={item.name} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-700"
                  >
                    ✓
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">
                      {item.name} <span className="text-slate-400">{item.version}</span>
                    </span>
                    <span className="block text-xs text-slate-500">{item.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-slate-200 bg-slate-50 px-8 py-7">
            <h2 className="text-sm font-semibold text-slate-900">Siguientes pasos</h2>
            <ol className="mt-3 space-y-1.5">
              {NEXT_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-slate-600">
                  <span className="font-mono text-xs text-slate-400">
                    {String(index + 2).padStart(2, '0')}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <footer className="flex items-center justify-between border-t border-slate-200 px-8 py-4">
            <p className="text-xs text-slate-500">
              55 pantallas programadas · 9 sprints · 18 semanas
            </p>
            <Link
              to="/ruta-inexistente"
              className="rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 hover:underline"
            >
              Probar ruta 404 →
            </Link>
          </footer>
        </div>
      </div>
    </main>
  )
}
