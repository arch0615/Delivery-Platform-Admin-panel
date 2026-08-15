import { useTheme, type ThemePreference } from '@/app/theme-context'
import { cn } from '@/lib/cn'

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
  { value: 'dark', label: 'Oscuro' },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="group"
      aria-label="Tema de la interfaz"
      className="inline-flex rounded-md border border-border-strong bg-surface p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              setPreference(option.value)
            }}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-accent text-accent-ink'
                : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
