import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/apiClient'
import type { LoginResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorBox, TextField } from '../components/shared'
import { PublicLayout } from '../layout/PublicLayout'

export function LoginPage() {
  const { logIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useMutation({
    mutationFn: () => api.post<LoginResponse>('/api/auth/login', { email, password }),
    onSuccess: (response) => {
      logIn(response)
      // Go back to the page they wanted before being asked to log in
      const wantedPage = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(wantedPage, { replace: true })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    login.mutate()
  }

  return (
    <PublicLayout title="Log in">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Email" name="email" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} error={login.error} />
        <TextField label="Password" name="password" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} error={login.error} />
        <ErrorBox error={login.error} />
        <Button type="submit" busy={login.isPending} className="w-full">
          Log in
        </Button>
        <p className="text-center text-sm text-ink-soft">
          New here? <Link to="/signup" className="text-brand hover:underline">Create a company account</Link>
        </p>
      </form>
    </PublicLayout>
  )
}
