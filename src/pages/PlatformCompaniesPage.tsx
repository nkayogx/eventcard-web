// Platform admin only: every vendor company on the platform,
// with buttons to suspend them or unlock message sending.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/apiClient'
import { type CompanyDetails, type CompanyPage, type CompanyRow as CompanyListRow } from '../api/types'
import { Button, Card, ErrorBox, PageTitle, StatusBadge } from '../components/ui'

export function PlatformCompaniesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const companies = useQuery({
    queryKey: ['platform-companies', search, page],
    queryFn: () =>
      api.get<CompanyPage>(`/api/platform/companies?search=${encodeURIComponent(search)}&page=${page}`),
  })

  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle title="All companies" subtitle="Every vendor using EventCard." />

      <input
        type="search"
        placeholder="Search by company name…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(0)
        }}
        className="w-full max-w-sm rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
      />

      <Card className="overflow-x-auto p-0">
        {companies.isLoading && <p className="p-6 text-ink-soft">Loading…</p>}
        <ErrorBox error={companies.error} />
        {companies.data && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-ink-soft">
              <tr>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium">Account</th>
                <th className="px-6 py-3 font-medium">Sending</th>
                <th className="px-6 py-3 font-medium">Plan · Credits</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {companies.data.companies.map((row) => (
                <CompanyRow key={row.company.id} row={row} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {companies.data && companies.data.totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <Button look="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-ink-soft">Page {page + 1} of {companies.data.totalPages}</span>
          <Button look="secondary" disabled={page + 1 >= companies.data.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function CompanyRow({ row }: { row: CompanyListRow }) {
  const company: CompanyDetails = row.company
  const queryClient = useQueryClient()
  const [adjusting, setAdjusting] = useState(false)

  // action is one of: suspend, reactivate, allow-sending, block-sending
  const act = useMutation({
    mutationFn: (action: string) => api.put<CompanyDetails>(`/api/platform/companies/${company.id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-companies'] }),
  })

  const suspended = company.accountStatus === 'SUSPENDED'

  return (
    <tr className="border-b border-line align-top last:border-0">
      <td className="px-6 py-3">
        <p className="font-medium">{company.name}</p>
        <p className="text-ink-soft">{company.contactEmail} · {company.contactPhone}</p>
        {act.error && <p className="mt-1 text-danger">{(act.error as Error).message}</p>}
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-ink-soft">{new Date(company.createdAt).toLocaleDateString()}</td>
      <td className="px-6 py-3">
        <StatusBadge good={!suspended}>{suspended ? 'Suspended' : 'Active'}</StatusBadge>
      </td>
      <td className="px-6 py-3">
        <StatusBadge good={company.canSendMessages}>{company.canSendMessages ? 'Allowed' : 'Locked'}</StatusBadge>
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <p>{row.planName}{row.planStatus === 'IN_GRACE' ? ' (grace)' : ''}</p>
        {row.planPaidUntil && row.planStatus !== 'EXPIRED' && (
          <p className="text-xs text-ink-soft">until {new Date(row.planPaidUntil).toLocaleDateString()}</p>
        )}
        <p className="text-xs">
          {row.creditBalance.toLocaleString('en-US')} credits ·{' '}
          <button onClick={() => setAdjusting(!adjusting)} className="text-brand hover:underline">Adjust</button>
        </p>
        {adjusting && <AdjustCredits companyId={company.id} onDone={() => setAdjusting(false)} />}
      </td>
      <td className="px-6 py-3">
        <div className="flex justify-end gap-2">
          <Button look="secondary" busy={act.isPending}
            onClick={() => act.mutate(company.canSendMessages ? 'block-sending' : 'allow-sending')}>
            {company.canSendMessages ? 'Lock sending' : 'Allow sending'}
          </Button>
          <Button look={suspended ? 'secondary' : 'danger'} busy={act.isPending}
            onClick={() => act.mutate(suspended ? 'reactivate' : 'suspend')}>
            {suspended ? 'Reactivate' : 'Suspend'}
          </Button>
        </div>
      </td>
    </tr>
  )
}

/** Add (e.g. 100) or remove (e.g. -100) credits by hand, with a note for the company's statement. */
function AdjustCredits({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const adjust = useMutation({
    mutationFn: () => api.post(`/api/platform/companies/${companyId}/credits`, { amount: Number(amount), note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-companies'] })
      onDone()
    },
  })
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="+100 / -100"
          aria-label="Credits to add or remove" className="w-24 rounded border border-line px-2 py-1 text-xs" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note"
          aria-label="Note" className="w-28 rounded border border-line px-2 py-1 text-xs" />
        <button disabled={!amount || !note || adjust.isPending} onClick={() => adjust.mutate()}
          className="rounded bg-brand px-2 text-xs text-white disabled:opacity-50">Save</button>
      </div>
      {adjust.error && <p className="text-xs text-danger">{(adjust.error as Error).message}</p>}
    </div>
  )
}
