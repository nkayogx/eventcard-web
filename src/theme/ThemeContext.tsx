// Light or dark mode for the whole app.
// The choice is remembered on this device; the first time, we follow the phone/computer setting.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'eventcard.theme'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function startingTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(startingTheme)

  // The class "dark" on <html> switches every colour to its dark version (see index.css).
  // A guest's invitation page (/i/...) always stays light: it is styled in the vendor's own colours.
  useEffect(() => {
    const isGuestInvitationPage = window.location.pathname.startsWith('/i/')
    document.documentElement.classList.toggle('dark', theme === 'dark' && !isGuestInvitationPage)
  }, [theme])

  function setTheme(newTheme: Theme) {
    localStorage.setItem(STORAGE_KEY, newTheme)
    setThemeState(newTheme)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext)
  if (!state) throw new Error('useTheme must be used inside <ThemeProvider>')
  return state
}
