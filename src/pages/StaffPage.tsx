// Staff: the people who work in the company.
// Owners and managers can see the list; only owners can invite and make changes.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../api/apiClient'
import { roleNames, type InvitationCreated, type StaffMember, type UserRole } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorBox, PageTitle, SelectField, StatusBadge, TextField } from '../components/shared'

const companyRoles: UserRole[] = ['OWNER', 'MANAGER', 'CHECK_IN_STAFF']
const roleChoices = companyRoles.map((role) => ({ value: role, label: roleNames[role] }))

export function StaffPage() {
  const { me } = useAuth()
  const isOwner = me?.role === 'OWNER'

  const staff = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<StaffMember[]>('/api/my-company/staff'),
  })

  return (
    <div className="max-w-4xl space-y-6">
      <PageTitle title="Staff" subtitle="The people who can log in to your company account." />

      {isOwner && <InviteForm />}

      <Card className="overflow-x-auto p-0">
        {staff.isLoading && <p className="p-6 text-ink-soft">Loading…</p>}
        <ErrorBox error={staff.error} />
        {staff.data && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-ink-soft">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                {isOwner && <th className="px-6 py-3" />}
              </tr>
            </thead>
            <tbody>
              {staff.data.map((person) => (
                <StaffRow key={person.id} person={person} canEdit={isOwner && person.id !== me?.userId} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function StaffRow({ person, canEdit }: { person: StaffMember; canEdit: boolean }) {
  const queryClient = useQueryClient()

  const change = useMutation({
    mutationFn: (changes: { role?: UserRole; active?: boolean }) =>
      api.put<StaffMember>(`/api/my-company/staff/${person.id}`, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-6 py-3">
        <p className="font-medium">{person.fullName}</p>
        <p className="text-ink-soft">{person.email}</p>
        {change.error && <p className="mt-1 text-danger">{(change.error as Error).message}</p>}
      </td>
      <td className="px-6 py-3">
        {canEdit ? (
          <select
            aria-label={`Role of ${person.fullName}`}
            value={person.role}
            disabled={change.isPending}
            onChange={(e) => change.mutate({ role: e.target.value as UserRole })}
            className="rounded-lg border border-line bg-card px-2 py-1"
          >
            {roleChoices.map((choice) => (
              <option key={choice.value} value={choice.value}>{choice.label}</option>
            ))}
          </select>
        ) : (
          roleNames[person.role]
        )}
      </td>
      <td className="px-6 py-3">
        <StatusBadge good={person.active}>{person.active ? 'Active' : 'Deactivated'}</StatusBadge>
      </td>
      {canEdit && (
        <td className="px-6 py-3 text-right">
          <Button look={person.active ? 'danger' : 'secondary'} busy={change.isPending}
            onClick={() => change.mutate({ active: !person.active })}>
            {person.active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </td>
      )}
    </tr>
  )
}

function InviteForm() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('MANAGER')
  const [copied, setCopied] = useState(false)

  const invite = useMutation({
    mutationFn: () => api.post<InvitationCreated>('/api/my-company/staff/invitations', { email, role }),
    onSuccess: () => {
      setEmail('')
      setCopied(false)
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    invite.mutate()
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link)
    setCopied(true)
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="font-semibold">Invite someone</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <TextField label="Email" name="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} error={invite.error} />
          <SelectField label="Role" name="role" options={roleChoices} value={role}
            onChange={(e) => setRole(e.target.value as UserRole)} error={invite.error} />
          <Button type="submit" busy={invite.isPending}>Create invitation</Button>
        </div>
        <ErrorBox error={invite.error} />
      </form>

      {invite.data && (
        <div className="mt-4 rounded-lg bg-brand-soft p-4 text-sm">
          <p>
            Invitation for <strong>{invite.data.email}</strong> is ready. Share this link with them
            (e.g. on WhatsApp). It works once and expires in 7 days.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={invite.data.invitationLink}
              className="flex-1 rounded-lg border border-line bg-card px-3 py-2 font-mono text-xs" />
            <Button look="secondary" type="button" onClick={() => copyLink(invite.data.invitationLink)}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
