import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'

/*
 * Connection status.
 *
 * Currently reflects browser online/offline only. It becomes the WebSocket
 * gateway indicator in Sprint 5 (A-044), where a silently dead socket in the
 * live operations console is the failure mode that actually matters.
 */
export function ConnectionIndicator() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
    }
    const goOffline = () => {
      setOnline(false)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const Icon = online ? Wifi : WifiOff

  return (
    <span
      // Offline is announced; the steady online state is not, to avoid noise.
      role="status"
      aria-live={online ? 'off' : 'polite'}
      title={online ? 'Conectado' : 'Sin conexión'}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        online ? 'text-ink-subtle' : 'bg-danger-soft text-danger',
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {online ? 'En línea' : 'Sin conexión'}
    </span>
  )
}
