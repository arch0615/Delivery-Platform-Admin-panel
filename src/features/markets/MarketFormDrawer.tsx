import { useState, type FormEvent } from 'react'

import { Alert, Button, Drawer, Field, FormRow, Input, Select } from '@/components/ui'
import { createMarketId, upsertMarket, type Market } from '@/lib/markets'

const CURRENCIES = ['MXN', 'COP', 'CLP', 'PEN', 'ARS', 'BRL', 'CRC', 'GTQ', 'USD', 'EUR']

const TIMEZONES = [
  'America/Mexico_City',
  'America/Monterrey',
  'America/Tijuana',
  'America/Cancun',
  'America/Merida',
  'America/Chihuahua',
  'America/Bogota',
  'America/Santiago',
  'America/Lima',
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Costa_Rica',
  'America/Guatemala',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/Madrid',
]

const EMPTY: Omit<Market, 'id' | 'createdAt'> = {
  code: '',
  name: '',
  countryCode: 'MX',
  currency: 'MXN',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  taxRegime: 'MX_IVA',
  isLive: false,
  launchedAt: null,
}

export type MarketFormDrawerProps = {
  open: boolean
  /** Null creates a new market. */
  market: Market | null
  onClose: () => void
  onSaved: () => void
}

export function MarketFormDrawer({ open, market, onClose, onSaved }: MarketFormDrawerProps) {
  return (
    <Drawer
      open={open}
      title={market ? 'Editar mercado' : 'Nuevo mercado'}
      description={
        market
          ? 'Los cambios de zona horaria afectan cómo se leen los horarios de venta.'
          : 'Un mercado agrupa zonas, tarifas y reglas fiscales de una ciudad o región.'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" form="market-form" type="submit">
            {market ? 'Guardar cambios' : 'Crear mercado'}
          </Button>
        </>
      }
    >
      {/*
        Mounted only while open and keyed by record, so the form resets by
        remounting rather than by syncing state from props in an effect.
      */}
      {open ? (
        <MarketForm key={market?.id ?? 'new'} market={market} onClose={onClose} onSaved={onSaved} />
      ) : null}
    </Drawer>
  )
}

type MarketFormProps = {
  market: Market | null
  onClose: () => void
  onSaved: () => void
}

function MarketForm({ market, onClose, onSaved }: MarketFormProps) {
  const [form, setForm] = useState(() => (market ? { ...market } : EMPTY))
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (form.code.trim() === '' || form.name.trim() === '') {
      setError('El código y el nombre son obligatorios.')
      return
    }

    upsertMarket({
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      id: market?.id ?? createMarketId(),
      createdAt: market?.createdAt ?? new Date().toISOString(),
    })

    onSaved()
    onClose()
  }

  return (
    <form id="market-form" onSubmit={onSubmit} className="grid gap-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <FormRow>
        <Field label="Código" required hint="Por ejemplo MX-CDMX.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={form.code}
              onChange={(event) => {
                update('code', event.target.value)
              }}
              placeholder="MX-CDMX"
              className="font-mono uppercase"
            />
          )}
        </Field>

        <Field label="País" required>
          {({ id }) => (
            <Input
              id={id}
              value={form.countryCode}
              onChange={(event) => {
                update('countryCode', event.target.value.toUpperCase().slice(0, 2))
              }}
              maxLength={2}
              className="font-mono uppercase"
            />
          )}
        </Field>
      </FormRow>

      <Field label="Nombre" required>
        {({ id }) => (
          <Input
            id={id}
            value={form.name}
            onChange={(event) => {
              update('name', event.target.value)
            }}
            placeholder="Ciudad de México"
          />
        )}
      </Field>

      <FormRow>
        <Field label="Moneda" required hint="Se congela en cada pedido.">
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={form.currency}
              onChange={(event) => {
                update('currency', event.target.value)
              }}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Régimen fiscal" required>
          {({ id }) => (
            <Input
              id={id}
              value={form.taxRegime}
              onChange={(event) => {
                update('taxRegime', event.target.value.toUpperCase())
              }}
              className="font-mono"
            />
          )}
        </Field>
      </FormRow>

      <Field
        label="Zona horaria"
        required
        hint="Determina horarios de venta de alcohol y ventanas de ley seca."
      >
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={form.timezone}
            onChange={(event) => {
              update('timezone', event.target.value)
            }}
          >
            {TIMEZONES.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Idioma" required>
        {({ id }) => (
          <Select
            id={id}
            value={form.locale}
            onChange={(event) => {
              update('locale', event.target.value)
            }}
          >
            <option value="es-MX">es-MX</option>
            <option value="pt-BR">pt-BR</option>
            <option value="en-US">en-US</option>
          </Select>
        )}
      </Field>

      <Alert tone="info">
        Un mercado nuevo se crea en pre-lanzamiento. Actívalo desde la lista cuando sus zonas y
        tarifas estén configuradas.
      </Alert>
    </form>
  )
}
