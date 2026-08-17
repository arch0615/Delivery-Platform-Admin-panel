/*
 * PLATFORM SETTINGS AND FEATURE FLAGS
 *
 * Mirrors `platform_settings` and `feature_flags` (database schema.txt §2).
 *
 * These are DATA, not deployment config: per-market behaviour has to be
 * changeable without a release, which is what makes one deployment serve every
 * market (web architecture.txt P8).
 */

export type SettingType = 'number' | 'duration_minutes' | 'money_minor' | 'boolean' | 'text'

export type PlatformSetting = {
  key: string
  label: string
  description: string
  type: SettingType
  value: string
  /** Null applies to every market. */
  marketId: string | null
  group: string
  updatedAt: string
  updatedBy: string
}

const SETTINGS_SEED: PlatformSetting[] = [
  {
    key: 'orders.merchant_accept_timeout_minutes',
    label: 'Tiempo para que el comercio acepte',
    description:
      'Si el comercio no responde en este tiempo, el pedido se cancela y se reembolsa automáticamente.',
    type: 'duration_minutes',
    value: '8',
    marketId: null,
    group: 'Pedidos',
    updatedAt: '2026-06-02T10:00:00Z',
    updatedBy: 'alex.ramirez@plataforma.mx',
  },
  {
    key: 'orders.customer_cancel_window_minutes',
    label: 'Ventana de cancelación del cliente',
    description: 'Después de este tiempo la cancelación pasa a reembolso parcial.',
    type: 'duration_minutes',
    value: '3',
    marketId: null,
    group: 'Pedidos',
    updatedAt: '2026-06-02T10:02:00Z',
    updatedBy: 'alex.ramirez@plataforma.mx',
  },
  {
    key: 'dispatch.offer_timeout_seconds',
    label: 'Tiempo de oferta al repartidor',
    description: 'Segundos que un repartidor tiene para aceptar antes de reofertar.',
    type: 'number',
    value: '45',
    marketId: null,
    group: 'Asignación',
    updatedAt: '2026-06-10T12:00:00Z',
    updatedBy: 'diana.ortega@plataforma.mx',
  },
  {
    key: 'dispatch.unacknowledged_escalation_seconds',
    label: 'Escalamiento por pedido sin atender',
    description:
      'Si el portal del comercio no confirma la recepción, se escala: sonido, SMS y alerta a operaciones.',
    type: 'number',
    value: '90',
    marketId: null,
    group: 'Asignación',
    updatedAt: '2026-06-10T12:05:00Z',
    updatedBy: 'diana.ortega@plataforma.mx',
  },
  {
    key: 'finance.refund_second_approver_threshold_minor',
    label: 'Umbral de segundo aprobador en reembolsos',
    description:
      'Por encima de este importe, el reembolso requiere que lo apruebe una persona distinta a quien lo solicitó.',
    type: 'money_minor',
    value: '150000',
    marketId: null,
    group: 'Finanzas',
    updatedAt: '2026-07-01T09:00:00Z',
    updatedBy: 'mario.beltran@plataforma.mx',
  },
  {
    key: 'finance.settlement_period_days',
    label: 'Periodo de liquidación',
    description: 'Días que abarca cada corrida de liquidación a comercios.',
    type: 'number',
    value: '7',
    marketId: null,
    group: 'Finanzas',
    updatedAt: '2026-07-01T09:05:00Z',
    updatedBy: 'mario.beltran@plataforma.mx',
  },
  {
    key: 'compliance.age_document_retention_days',
    label: 'Retención de documentos de edad',
    description:
      'Días que se conservan las imágenes de identificación antes de purgarse. Debe coincidir con el aviso de privacidad.',
    type: 'number',
    value: '90',
    marketId: null,
    group: 'Cumplimiento',
    updatedAt: '2026-07-14T16:00:00Z',
    updatedBy: 'luis.carranza@plataforma.mx',
  },
  {
    key: 'support.ticket_sla_hours',
    label: 'SLA de primera respuesta',
    description: 'Horas objetivo para la primera respuesta en soporte.',
    type: 'number',
    value: '4',
    marketId: null,
    group: 'Soporte',
    updatedAt: '2026-07-20T08:00:00Z',
    updatedBy: 'sofia.nunez@plataforma.mx',
  },
]

export type FeatureFlag = {
  key: string
  label: string
  description: string
  enabled: boolean
  /** 0-100. Applies only while enabled. */
  rolloutPercent: number
  marketId: string | null
  updatedAt: string
  updatedBy: string
}

const FLAGS_SEED: FeatureFlag[] = [
  {
    key: 'checkout.cash_on_delivery',
    label: 'Pago en efectivo',
    description: 'Habilita el cobro contra entrega y el saldo de efectivo del repartidor.',
    enabled: true,
    rolloutPercent: 100,
    marketId: null,
    updatedAt: '2026-06-01T10:00:00Z',
    updatedBy: 'alex.ramirez@plataforma.mx',
  },
  {
    key: 'checkout.oxxo_voucher',
    label: 'Pago en OXXO',
    description: 'Referencia de pago en efectivo. El pedido queda pendiente hasta que se liquida.',
    enabled: false,
    rolloutPercent: 0,
    marketId: null,
    updatedAt: '2026-06-01T10:05:00Z',
    updatedBy: 'alex.ramirez@plataforma.mx',
  },
  {
    key: 'dispatch.auto_assign',
    label: 'Asignación automática',
    description:
      'Asigna repartidores por algoritmo. Apagado, la asignación es manual desde el tablero.',
    enabled: false,
    rolloutPercent: 0,
    marketId: null,
    updatedAt: '2026-06-15T11:00:00Z',
    updatedBy: 'diana.ortega@plataforma.mx',
  },
  {
    key: 'grocery.substitutions',
    label: 'Sustituciones en súper',
    description: 'Permite proponer reemplazos cuando un artículo no está disponible.',
    enabled: true,
    rolloutPercent: 40,
    marketId: null,
    updatedAt: '2026-07-05T09:00:00Z',
    updatedBy: 'alex.ramirez@plataforma.mx',
  },
  {
    key: 'orders.scheduled_delivery',
    label: 'Entrega programada',
    description: 'Permite al cliente elegir una franja horaria futura.',
    enabled: false,
    rolloutPercent: 0,
    marketId: null,
    updatedAt: '2026-07-18T14:00:00Z',
    updatedBy: 'alex.ramirez@plataforma.mx',
  },
  {
    key: 'storefront.web_checkout',
    label: 'Checkout en la web',
    description:
      'Apagado, la web es solo catálogo y SEO y el pedido se completa en la app (pregunta abierta Q10).',
    enabled: true,
    rolloutPercent: 100,
    marketId: null,
    updatedAt: '2026-08-01T09:00:00Z',
    updatedBy: 'alex.ramirez@plataforma.mx',
  },
]

let settings: PlatformSetting[] = [...SETTINGS_SEED]
let flags: FeatureFlag[] = [...FLAGS_SEED]

export function listSettings(): readonly PlatformSetting[] {
  return settings
}

export function settingGroups(): string[] {
  return Array.from(new Set(settings.map((setting) => setting.group)))
}

export function updateSetting(key: string, value: string, updatedBy: string): void {
  settings = settings.map((setting) =>
    setting.key === key
      ? { ...setting, value, updatedBy, updatedAt: new Date().toISOString() }
      : setting,
  )
}

export function listFlags(): readonly FeatureFlag[] {
  return flags
}

export function updateFlag(
  key: string,
  patch: { enabled?: boolean; rolloutPercent?: number },
  updatedBy: string,
): void {
  flags = flags.map((flag) =>
    flag.key === key
      ? {
          ...flag,
          ...patch,
          // A disabled flag with a rollout percentage reads as partly live and
          // is a reliable source of confusion, so turning it off zeroes it.
          rolloutPercent:
            patch.enabled === false ? 0 : (patch.rolloutPercent ?? flag.rolloutPercent),
          updatedBy,
          updatedAt: new Date().toISOString(),
        }
      : flag,
  )
}

/** Renders a stored value for display according to its declared type. */
export function formatSettingValue(setting: PlatformSetting, locale = 'es-MX'): string {
  switch (setting.type) {
    case 'duration_minutes':
      return `${setting.value} min`
    case 'money_minor':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'MXN',
      }).format(Number(setting.value) / 100)
    case 'boolean':
      return setting.value === 'true' ? 'Sí' : 'No'
    default:
      return setting.value
  }
}
