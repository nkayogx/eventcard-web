// Wrap a page in <RequireLogin> to allow only logged-in users,
// optionally only certain roles:  <RequireLogin roles={['OWNER']}>...</RequireLogin>

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from '../api/types'
import { useAuth } from './AuthContext'

interface Props {
  roles?: UserRole[]
  children: ReactNode
}

export function RequireLogin({ roles, children }: Props) {
  const { me, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <p className="p-8 text-ink-soft">Loading…</p>
  }
  if (!me) {
    // Remember where they wanted to go, so we can send them back after login
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (roles && !roles.includes(me.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
