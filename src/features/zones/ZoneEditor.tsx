import { Redo2, Trash2, X } from 'lucide-react'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'

import { useCurrentUser } from '@/app/session-context'
import { Alert, Badge, Button, Field, Input, Select, Spinner } from '@/components/ui'
import {
  formatArea,
  ringAreaKm2,
  ringsOverlap,
  validateRing,
  type Position,
  type Ring,
} from '@/lib/geo'
import { MARKET_CENTERS, createZoneId, upsertZone, zonesInMarket, type Zone } from '@/lib/zones'

/*
 * A-012 Zone polygon editor.
 *
 * The highest-leverage screen in the schedule: service areas, fees, dispatch
 * and alcohol sale windows all hang off zones, so a wrong boundary here shows
 * up as a merchant nobody can order from.
 *
 * Overlaps are legal - `priority` decides which zone wins - but they are
 * surfaced before saving, because an unnoticed overlap silently reroutes
 * orders and nothing downstream complains.
 */

/*
 * MapLibre is ~800 kB, and most admins never open this editor - support and
 * finance never touch a map at all. Loading it on demand keeps it out of the
 * bundle everyone else downloads.
 */
const ZoneMap = lazy(() =>
  import('@/features/zones/ZoneMap').then((module) => ({ default: module.ZoneMap })),
)

export type ZoneEditorProps = {
  open: boolean
  /** Null creates a new zone in the current market. */
  zone: Zone | null
  onClose: () => void
  onSaved: () => void
}

export function ZoneEditor({ open, zone, onClose, onSaved }: ZoneEditorProps) {
  const { market } = useCurrentUser()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="zone-editor-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-auto h-[92vh] max-h-none w-[95vw] max-w-none rounded-xl border border-border-base bg-surface p-0 text-left text-ink shadow-raised backdrop:bg-black/50"
    >
      {/* Keyed so the draft resets by remounting rather than syncing props. */}
      {open ? (
        <ZoneEditorBody
          key={zone?.id ?? 'new'}
          zone={zone}
          marketId={market.id}
          marketName={market.name}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </dialog>
  )
}

type BodyProps = {
  zone: Zone | null
  marketId: string
  marketName: string
  onClose: () => void
  onSaved: () => void
}

function ZoneEditorBody({ zone, marketId, marketName, onClose, onSaved }: BodyProps) {
  const [name, setName] = useState(zone?.name ?? '')
  const [priority, setPriority] = useState(String(zone?.priority ?? 10))
  const [isActive, setIsActive] = useState(zone?.isActive ?? false)
  const [points, setPoints] = useState<Ring>(zone?.boundary ?? [])
  const [error, setError] = useState<string | null>(null)

  const otherZones = useMemo(
    () => zonesInMarket(marketId).filter((entry) => entry.id !== zone?.id),
    [marketId, zone?.id],
  )

  const center: Position = zone?.boundary[0] ?? MARKET_CENTERS[marketId] ?? [-99.14, 19.43]

  const validation = validateRing(points)
  const areaKm2 = points.length >= 3 ? ringAreaKm2(points) : 0

  const overlaps = useMemo(
    () =>
      points.length < 3 ? [] : otherZones.filter((entry) => ringsOverlap(points, entry.boundary)),
    [points, otherZones],
  )

  const addPoint = (point: Position) => {
    setPoints((previous) => [...previous, point])
  }

  const movePoint = (index: number, point: Position) => {
    setPoints((previous) => previous.map((entry, i) => (i === index ? point : entry)))
  }

  const removePoint = (index: number) => {
    setPoints((previous) => previous.filter((_, i) => i !== index))
  }

  const undo = () => {
    setPoints((previous) => previous.slice(0, -1))
  }

  const save = () => {
    if (name.trim() === '') {
      setError('La zona necesita un nombre.')
      return
    }
    if (!validation.valid) {
      setError(validation.errors[0] ?? 'El contorno no es válido.')
      return
    }

    upsertZone({
      id: zone?.id ?? createZoneId(),
      marketId,
      name: name.trim(),
      boundary: points,
      isActive,
      priority: Number(priority) || 0,
      createdAt: zone?.createdAt ?? new Date().toISOString(),
    })

    onSaved()
    onClose()
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border-base px-5 py-3">
        <div>
          <h2 id="zone-editor-title" className="text-sm font-semibold">
            {zone ? `Editar zona: ${zone.name}` : 'Nueva zona de reparto'}
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {marketName} · Haz clic en el mapa para agregar puntos, arrastra para moverlos, doble
            clic para eliminar uno.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
          <X aria-hidden="true" className="size-4" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <Suspense
            fallback={
              <div className="flex size-full items-center justify-center bg-surface-sunken">
                <Spinner className="size-6 text-ink-subtle" label="Cargando mapa" />
              </div>
            }
          >
            <ZoneMap
              points={points}
              otherZones={otherZones}
              center={center}
              onAddPoint={addPoint}
              onMovePoint={movePoint}
              onRemovePoint={removePoint}
            />
          </Suspense>
        </div>

        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border-base bg-surface px-4 py-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          <Field label="Nombre de la zona" required>
            {({ id }) => (
              <Input
                id={id}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
                placeholder="Centro Histórico"
              />
            )}
          </Field>

          <Field label="Prioridad" hint="Si dos zonas se traslapan, gana la de mayor prioridad.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="number"
                aria-describedby={describedBy}
                value={priority}
                onChange={(event) => {
                  setPriority(event.target.value)
                }}
              />
            )}
          </Field>

          <Field label="Estado">
            {({ id }) => (
              <Select
                id={id}
                value={isActive ? 'true' : 'false'}
                onChange={(event) => {
                  setIsActive(event.target.value === 'true')
                }}
              >
                <option value="false">Inactiva</option>
                <option value="true">Activa</option>
              </Select>
            )}
          </Field>

          <div className="rounded-lg border border-border-base bg-surface-muted px-3 py-2.5">
            <dl className="grid gap-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Puntos</dt>
                <dd className="tabular font-medium">{points.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Área</dt>
                <dd className="tabular font-medium">
                  {points.length >= 3 ? formatArea(areaKm2) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {points.length > 0 && !validation.valid ? (
            <Alert tone="warning" title="Contorno incompleto">
              <ul className="list-inside list-disc">
                {validation.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {overlaps.length > 0 ? (
            <Alert tone="info" title={`Se traslapa con ${overlaps.length} zona(s)`}>
              <ul className="mt-1 grid gap-1">
                {overlaps.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2">
                    <span>{entry.name}</span>
                    <Badge tone="neutral">prioridad {entry.priority}</Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5">
                Está permitido: la prioridad decide cuál aplica. Verifica que sea intencional.
              </p>
            </Alert>
          ) : null}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={points.length === 0}
              onClick={undo}
              leadingIcon={<Redo2 aria-hidden="true" className="size-3.5 -scale-x-100" />}
            >
              Deshacer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={points.length === 0}
              onClick={() => {
                setPoints([])
              }}
              leadingIcon={<Trash2 aria-hidden="true" className="size-3.5" />}
            >
              Limpiar
            </Button>
          </div>

          <div className="mt-auto grid gap-2 border-t border-border-base pt-3">
            <Button variant="primary" onClick={save} disabled={!validation.valid}>
              {zone ? 'Guardar zona' : 'Crear zona'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
