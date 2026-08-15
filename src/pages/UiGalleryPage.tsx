import { useState } from 'react'
import { Link } from 'react-router'

import { ThemeToggle } from '@/components/ThemeToggle'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  DateTime,
  EmptyState,
  Field,
  FormRow,
  Input,
  Money,
  Rate,
  Select,
  Skeleton,
  SkeletonTable,
  Spinner,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableWrapper,
  Textarea,
} from '@/components/ui'
import type { BadgeTone } from '@/components/ui'

/*
 * Living style guide for the admin design system.
 *
 * Unlike the scaffold home page, this one stays: it is how a developer checks
 * a component in both themes before using it, and how a designer reviews the
 * token layer without opening the code.
 */

type OrderRow = {
  number: string
  merchant: string
  status: { label: string; tone: BadgeTone }
  placedAt: string
  totalMinor: number
  commissionBps: number
}

const ORDERS: OrderRow[] = [
  {
    number: 'MX-4F82K1',
    merchant: 'Taquería El Fogón',
    status: { label: 'En camino', tone: 'info' },
    placedAt: '2026-08-14T21:04:00Z',
    totalMinor: 48350,
    commissionBps: 2250,
  },
  {
    number: 'MX-9QP3L7',
    merchant: 'Súper La Esquina',
    status: { label: 'Entregado', tone: 'positive' },
    placedAt: '2026-08-14T20:12:00Z',
    totalMinor: 132900,
    commissionBps: 1800,
  },
  {
    number: 'MX-2XD8M4',
    merchant: 'Licores del Valle',
    status: { label: 'Verificar edad', tone: 'warning' },
    placedAt: '2026-08-14T19:47:00Z',
    totalMinor: 89000,
    commissionBps: 3000,
  },
  {
    number: 'MX-7BN1V9',
    merchant: 'Farmacia Central',
    status: { label: 'Cancelado', tone: 'danger' },
    placedAt: '2026-08-14T18:30:00Z',
    totalMinor: -21500,
    commissionBps: 0,
  },
]

const TONES: BadgeTone[] = ['neutral', 'accent', 'positive', 'warning', 'danger', 'info']

export function UiGalleryPage() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border-base bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-ink-subtle uppercase">
              APP-C · Paso 2 · A-006
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ink">Sistema de diseño</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/"
              className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:underline"
            >
              ← Inicio
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
        {/* ---------------------------------------------------------- tokens */}
        <Card>
          <CardHeader
            title="Tokens semánticos"
            description="Los componentes usan solo estos nombres. Cambian con el tema sin recompilar."
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {[
                ['surface', 'bg-surface'],
                ['surface-muted', 'bg-surface-muted'],
                ['surface-sunken', 'bg-surface-sunken'],
                ['accent', 'bg-accent'],
                ['positive', 'bg-positive'],
                ['warning', 'bg-warning'],
                ['danger', 'bg-danger'],
                ['info', 'bg-info'],
              ].map(([name, className]) => (
                <div key={name} className="min-w-0">
                  <div className={`h-12 rounded-md border border-border-base ${className ?? ''}`} />
                  <p className="mt-1.5 truncate font-mono text-[11px] text-ink-muted">{name}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* --------------------------------------------------------- buttons */}
        <Card>
          <CardHeader
            title="Botones"
            description="Un botón en estado de carga queda deshabilitado: evita el doble envío."
          />
          <CardBody className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Aprobar comercio</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="ghost">Ver detalle</Button>
            <Button variant="danger">Reembolsar pedido</Button>
            <Button variant="primary" size="sm">
              Acción pequeña
            </Button>
            <Button variant="secondary" disabled>
              Deshabilitado
            </Button>
            <Button
              variant="primary"
              loading={loading}
              onClick={() => {
                setLoading(true)
                setTimeout(() => {
                  setLoading(false)
                }, 1800)
              }}
            >
              {loading ? 'Procesando…' : 'Probar carga'}
            </Button>
            <Spinner className="text-ink-muted" />
          </CardBody>
        </Card>

        {/* ---------------------------------------------------------- badges */}
        <Card>
          <CardHeader title="Etiquetas de estado" description="Con y sin indicador." />
          <CardBody className="flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} dot>
                {tone}
              </Badge>
            ))}
            {TONES.map((tone) => (
              <Badge key={`${tone}-plain`} tone={tone}>
                {tone}
              </Badge>
            ))}
          </CardBody>
        </Card>

        {/* ------------------------------------------------------ formulario */}
        <Card>
          <CardHeader
            title="Controles de formulario"
            description="Etiqueta, ayuda y error conectados por accesibilidad automáticamente."
          />
          <CardBody className="grid gap-4">
            <FormRow>
              <Field label="Nombre comercial" required hint="Visible para los clientes.">
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} placeholder="Taquería El Fogón" />
                )}
              </Field>

              <Field label="RFC" error="El RFC debe tener 12 o 13 caracteres.">
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} defaultValue="TEF9" invalid />
                )}
              </Field>
            </FormRow>

            <FormRow>
              <Field label="Vertical" hint="Determina reglas de edad y licencias.">
                {({ id, describedBy }) => (
                  <Select id={id} aria-describedby={describedBy} defaultValue="restaurants">
                    <option value="restaurants">Restaurantes</option>
                    <option value="grocery">Súper</option>
                    <option value="retail">Tiendas</option>
                    <option value="alcohol">Licores</option>
                  </Select>
                )}
              </Field>

              <Field label="Comisión (puntos base)" hint="2250 = 22.5%">
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} type="number" defaultValue={2250} />
                )}
              </Field>
            </FormRow>

            <Field label="Notas internas">
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="Visible solo para el equipo de operaciones."
                />
              )}
            </Field>

            <label className="flex items-center gap-2 text-sm text-ink">
              <Checkbox defaultChecked />
              Requiere verificación de edad en la entrega
            </label>
          </CardBody>
          <CardFooter>
            <span className="text-xs text-ink-muted">Los cambios quedan en la bitácora.</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                Descartar
              </Button>
              <Button variant="primary" size="sm">
                Guardar
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* ----------------------------------------------------------- tabla */}
        <Card>
          <CardHeader
            title="Tabla de pedidos"
            description="Importes en unidades menores, fechas en la zona horaria del mercado."
            actions={
              <Button variant="secondary" size="sm">
                Exportar CSV
              </Button>
            }
          />
          <TableWrapper>
            <Table>
              <THead>
                <TR>
                  <TH>Pedido</TH>
                  <TH>Comercio</TH>
                  <TH>Estado</TH>
                  <TH>Recibido</TH>
                  <TH numeric>Comisión</TH>
                  <TH numeric>Total</TH>
                </TR>
              </THead>
              <TBody>
                {ORDERS.map((order) => (
                  <TR key={order.number} interactive>
                    <TD className="font-mono text-xs">{order.number}</TD>
                    <TD>{order.merchant}</TD>
                    <TD>
                      <Badge tone={order.status.tone} dot>
                        {order.status.label}
                      </Badge>
                    </TD>
                    <TD>
                      <DateTime value={order.placedAt} display="time" />
                      <span className="ml-2 text-xs text-ink-subtle">
                        <DateTime value={order.placedAt} display="relative" />
                      </span>
                    </TD>
                    <TD numeric>
                      <Rate bps={order.commissionBps} />
                    </TD>
                    <TD numeric>
                      <Money amountMinor={order.totalMinor} currency="MXN" signed />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrapper>
          <CardFooter>
            <span className="text-xs text-ink-muted">4 de 1,284 pedidos</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled>
                Anterior
              </Button>
              <Button variant="secondary" size="sm">
                Siguiente
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* ------------------------------------------------- estados vacíos */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Estado vacío" />
            <EmptyState
              title="Sin resultados"
              description="Ningún pedido coincide con los filtros actuales."
              action={
                <Button variant="secondary" size="sm">
                  Limpiar filtros
                </Button>
              }
            />
          </Card>

          <Card>
            <CardHeader title="Estado de carga" description="Mismo alto que la tabla real." />
            <SkeletonTable rows={4} columns={4} />
            <CardBody className="flex gap-3 border-t border-border-base">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 flex-1" />
            </CardBody>
          </Card>
        </div>

        {/* ---------------------------------------------------------- dinero */}
        <Card>
          <CardHeader
            title="Formato de dinero y fechas"
            description="Único camino permitido para mostrar importes."
          />
          <CardBody>
            <TableWrapper>
              <Table>
                <THead>
                  <TR>
                    <TH>Entrada</TH>
                    <TH>Componente</TH>
                    <TH numeric>Resultado</TH>
                  </TR>
                </THead>
                <TBody>
                  <TR>
                    <TD className="font-mono text-xs">123456 MXN</TD>
                    <TD className="text-ink-muted">Money</TD>
                    <TD numeric>
                      <Money amountMinor={123456} currency="MXN" />
                    </TD>
                  </TR>
                  <TR>
                    <TD className="font-mono text-xs">-21500 MXN</TD>
                    <TD className="text-ink-muted">Money signed</TD>
                    <TD numeric>
                      <Money amountMinor={-21500} currency="MXN" signed />
                    </TD>
                  </TR>
                  <TR>
                    <TD className="font-mono text-xs">99900 USD</TD>
                    <TD className="text-ink-muted">Money</TD>
                    <TD numeric>
                      <Money amountMinor={99900} currency="USD" locale="en-US" />
                    </TD>
                  </TR>
                  <TR>
                    <TD className="font-mono text-xs">2250 bps</TD>
                    <TD className="text-ink-muted">Rate</TD>
                    <TD numeric>
                      <Rate bps={2250} />
                    </TD>
                  </TR>
                  <TR>
                    <TD className="font-mono text-xs">2026-08-14T21:04:00Z</TD>
                    <TD className="text-ink-muted">DateTime · CDMX</TD>
                    <TD numeric>
                      <DateTime value="2026-08-14T21:04:00Z" />
                    </TD>
                  </TR>
                  <TR>
                    <TD className="font-mono text-xs">2026-08-14T21:04:00Z</TD>
                    <TD className="text-ink-muted">DateTime · Tijuana</TD>
                    <TD numeric>
                      <DateTime value="2026-08-14T21:04:00Z" timeZone="America/Tijuana" />
                    </TD>
                  </TR>
                </TBody>
              </Table>
            </TableWrapper>
          </CardBody>
        </Card>
      </main>
    </div>
  )
}
