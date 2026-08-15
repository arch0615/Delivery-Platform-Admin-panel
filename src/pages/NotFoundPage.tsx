import { Link, useLocation } from 'react-router'

import { Button, Card, CardBody } from '@/components/ui'

export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardBody className="px-8 py-10 text-center">
          <p className="font-mono text-5xl font-semibold text-ink-subtle">404</p>
          <h1 className="mt-4 text-lg font-semibold text-ink">Página no encontrada</h1>
          <p className="mt-2 text-sm text-ink-muted">
            La ruta{' '}
            <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-ink">{pathname}</code> no
            existe en el panel.
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button variant="primary">Volver al inicio</Button>
          </Link>
        </CardBody>
      </Card>
    </main>
  )
}
