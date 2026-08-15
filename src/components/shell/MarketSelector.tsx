import { Globe } from 'lucide-react'

import { useSession } from '@/app/session-context'
import { Select } from '@/components/ui'

/**
 * Market selector (A-004).
 *
 * Hidden when the admin is scoped to a single market - a control with one
 * option is noise. Switching market must refetch every open view; there is
 * nothing to refetch yet, so that wiring lands with the data layer.
 */
export function MarketSelector() {
  const { markets, market, setMarketId } = useSession()

  if (markets.length <= 1) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Globe aria-hidden="true" className="size-3.5" />
        {market.name}
      </span>
    )
  }

  return (
    <label className="flex items-center gap-1.5">
      <Globe aria-hidden="true" className="size-3.5 text-ink-subtle" />
      <span className="sr-only">Mercado</span>
      <Select
        value={market.id}
        onChange={(event) => {
          setMarketId(event.target.value)
        }}
        className="h-8 w-44 text-xs"
      >
        {markets.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} {option.isLive ? '' : '(pre-lanzamiento)'}
          </option>
        ))}
      </Select>
    </label>
  )
}
