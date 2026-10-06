// The page an invited staff member opens from their invitation link.
// They see which company invited them, choose a password, and are logged in.

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/apiClient'
import { roleNames, type InvitationDetails, type LoginResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorBox, TextField } from '../components/shared'
import { PublicLayout } from '../layout/PublicLayout'

export function AcceptInvitationPage() {
  const { code } = useParams()
  const { logIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', phone: '', password: '' })

  const invitation = useQuery({
    queryKey: ['invitation', code],
    queryFn: () => api.get<InvitationDetails>(`/api/invitations/${code}`),
    retry: false,
  })

  const accept = useMutation({
    // Phone is optional, so we leave it out when empty
    mutationFn: () =>
      api.post<LoginResponse>(`/api/invitations/${code}/accept`, { ...form, phone: form.phone || null }),
    onSuccess: (response) => {
      logIn(response)
      navigate('/')
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    accept.mutate()
  }

  if (invitation.isLoading) {
    return <PublicLayout title="Loading invitation…">{null}</PublicLayout>
  }
  if (invitation.error || !invitation.data) {
    return (
      <PublicLayout title="Invitation not available">
        <ErrorBox error={invitation.error} />
        <p className="mt-4 text-sm">
          <Link to="/login" className="text-brand hover:underline">Go to log in</Link>
        </p>
      </PublicLayout>
    )
  }

  const details = invitation.data
  return (
    <PublicLayout
      title={`Join ${details.companyName}`}
      subtitle={`You've been invited as ${roleNames[details.role]} (${details.email}).`}
    >
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Your full name" name="fullName" required value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={accept.error} />
        <TextField label="Phone (optional)" name="phone" value={form.phone} hint="International format, e.g. +255712345678"
          onChange={(e) => setForm({ ...form, phone: e.target.value })} error={accept.error} />
        <TextField label="Choose a password" name="password" type="password" required minLength={8}
          hint="At least 8 characters" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} error={accept.error} />
        <ErrorBox error={accept.error} />
        <Button type="submit" busy={accept.isPending} className="w-full">
          Join company
        </Button>
      </form>
    </PublicLayout>
  )
}
