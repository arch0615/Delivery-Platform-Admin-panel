import { Link, useLocation } from 'react-router'

export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        <p className="font-mono text-5xl font-semibold text-slate-300">404</p>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          La ruta{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{pathname}</code> no
          existe en el panel.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
