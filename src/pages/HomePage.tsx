import { Link } from 'react-router'

import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge, Button, Card, CardBody, CardFooter, CardHeader } from '@/components/ui'

/*
 * Temporary scaffold landing page.
 *
 * Replaced by the real app shell and dashboard (A-003 / A-086) in a later step.
 */

type Step = {
  index: number
  label: string
  status: 'done' | 'next' | 'pending'
}

const STEPS: Step[] = [
  { index: 1, label: 'Andamiaje del proyecto y herramientas', status: 'done' },
  { index: 2, label: 'Capa de tema y componentes base (A-006)', status: 'done' },
  { index: 3, label: 'Shell de la aplicación y navegación (A-003)', status: 'next' },
  { index: 4, label: 'Inicio de sesión y 2FA (A-001, A-002)', status: 'pending' },
  { index: 5, label: 'Framework de recursos (A-005)', status: 'pending' },
]

const STATUS_LABEL: Record<Step['status'], string> = {
  done: 'Listo',
  next: 'Siguiente',
  pending: 'Pendiente',
}

const STATUS_TONE = {
  done: 'positive',
  next: 'accent',
  pending: 'neutral',
} as const

export function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader
            title={<span className="text-base">Panel Administrativo</span>}
            description="Plataforma global de entregas multi-mercado"
            actions={<ThemeToggle />}
          />

          <CardBody>
            <ol className="grid gap-2.5">
              {STEPS.map((step) => (
                <li key={step.index} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 font-mono text-xs text-ink-subtle">
                    {String(step.index).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-ink">{step.label}</span>
                  <Badge tone={STATUS_TONE[step.status]} dot={step.status !== 'pending'}>
                    {STATUS_LABEL[step.status]}
                  </Badge>
                </li>
              ))}
            </ol>
          </CardBody>

          <CardFooter>
            <p className="text-xs text-ink-muted">55 pantallas · 9 sprints · 18 semanas</p>
            <div className="flex items-center gap-2">
              <Link to="/ruta-inexistente">
                <Button variant="ghost" size="sm">
                  Probar 404
                </Button>
              </Link>
              <Link to="/ui">
                <Button variant="primary" size="sm">
                  Sistema de diseño →
                </Button>
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
