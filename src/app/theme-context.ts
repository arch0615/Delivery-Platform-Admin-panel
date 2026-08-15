import { createContext, use } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'admin.theme'

export type ThemeContextValue = {
  /** What the user chose, including 'system'. */
  preference: ThemePreference
  /** What is actually rendered right now. */
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext)

  if (!value) {
    throw new Error('useTheme must be used inside a ThemeProvider')
  }

  return value
}
