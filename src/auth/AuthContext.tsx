// Keeps track of who is logged in, for the whole app.
//
// Any screen can call  useAuth()  to get:
//   me        - the logged-in user (or null)
//   logIn()   - save the token after signup / login / accepting an invitation
//   logOut()  - forget the token

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getSavedToken, onLoggedOut, saveToken } from '../api/apiClient'
import type { LoginResponse, Me } from '../api/types'

interface AuthState {
  me: Me | null
  isLoading: boolean
  logIn: (response: LoginResponse) => void
  logOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(getSavedToken())

  // Ask the backend "who am I?" whenever we have a token
  const meQuery = useQuery({
    queryKey: ['me', token],
    queryFn: () => api.get<Me>('/api/me'),
    enabled: token !== null,
    retry: false,
  })

  const logIn = useCallback(
    (response: LoginResponse) => {
      saveToken(response.token)
      queryClient.setQueryData(['me', response.token], response.me)
      setToken(response.token)
    },
    [queryClient],
  )

  const logOut = useCallback(() => {
    saveToken(null)
    setToken(null)
    queryClient.clear()
  }, [queryClient])

  // If the backend ever says our token is no longer valid, log out
  useEffect(() => onLoggedOut(logOut), [logOut])

  const value: AuthState = {
    me: token ? (meQuery.data ?? null) : null,
    isLoading: token !== null && meQuery.isLoading,
    logIn,
    logOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return auth
}
