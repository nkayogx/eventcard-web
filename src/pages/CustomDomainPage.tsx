// Custom domain (owner only):
//   step 1 - enter your domain, we show a DNS record to add
//   step 2 - press "Verify" once you've added it

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../api/apiClient'
import type { CompanyDetails } from '../api/types'
import { Button, Card, ErrorBox, PageTitle, StatusBadge, SuccessBox, TextField } from '../components/ui'

export function CustomDomainPage() {
  const queryClient = useQueryClient()
  const [domainInput, setDomainInput] = useState('')

  const company = useQuery({
    queryKey: ['my-company'],
    queryFn: () => api.get<CompanyDetails>('/api/my-company'),
  })

  function showUpdatedCompany(updated: CompanyDetails) {
    queryClient.setQueryData(['my-company'], updated)
  }

  const setDomain = useMutation({
    mutationFn: () => api.post<CompanyDetails>('/api/my-company/custom-domain', { domain: domainInput }),
    onSuccess: (updated) => {
      showUpdatedCompany(updated)
      setDomainInput('')
    },
  })
  const verify = useMutation({
    mutationFn: () => api.post<CompanyDetails>('/api/my-company/custom-domain/verify'),
    onSuccess: showUpdatedCompany,
  })
  const remove = useMutation({
    mutationFn: () => api.delete<CompanyDetails>('/api/my-company/custom-domain'),
    onSuccess: showUpdatedCompany,
  })

  if (company.isLoading) return <p className="text-ink-soft">Loading…</p>
  if (company.error) return <ErrorBox error={company.error} />

  const domain = company.data?.customDomain ?? null

  function submit(event: FormEvent) {
    event.preventDefault()
    setDomain.mutate()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle
        title="Custom domain"
        subtitle="Send invitations from your own web address, e.g. invites.yourcompany.com, instead of ours."
      />

      {domain && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold">{domain.domain}</p>
            <StatusBadge good={domain.verified}>{domain.verified ? 'Verified' : 'Not verified yet'}</StatusBadge>
          </div>

          {!domain.verified && (
            <>
              <p className="text-sm text-ink-soft">
                Log in to the company where you bought your domain and add these two DNS records. Then press "Verify".
              </p>
              <dl className="grid gap-2 rounded-lg bg-paper p-4 text-sm sm:grid-cols-[120px_1fr]">
                <dt className="text-ink-soft">Type</dt>
                <dd className="font-mono">TXT</dd>
                <dt className="text-ink-soft">Name / Host</dt>
                <dd className="font-mono break-all">{domain.txtRecordName}</dd>
                <dt className="text-ink-soft">Value</dt>
                <dd className="font-mono break-all">{domain.txtRecordValue}</dd>
              </dl>
              {domain.cnameTarget && (
                <dl className="grid gap-2 rounded-lg bg-paper p-4 text-sm sm:grid-cols-[120px_1fr]">
                  <dt className="text-ink-soft">Type</dt>
                  <dd className="font-mono">CNAME</dd>
                  <dt className="text-ink-soft">Name / Host</dt>
                  <dd className="font-mono break-all">{domain.domain}</dd>
                  <dt className="text-ink-soft">Points to</dt>
                  <dd className="font-mono break-all">{domain.cnameTarget}</dd>
                </dl>
              )}
              {verify.error && <p className="text-sm text-danger">{(verify.error as Error).message}</p>}
            </>
          )}
          {verify.isSuccess && domain.verified && <SuccessBox>Your domain is verified.</SuccessBox>}

          <div className="flex gap-3">
            {!domain.verified && (
              <Button onClick={() => verify.mutate()} busy={verify.isPending}>Verify</Button>
            )}
            <Button look="danger" onClick={() => remove.mutate()} busy={remove.isPending}>Remove domain</Button>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <h2 className="font-semibold">{domain ? 'Use a different domain' : 'Add your domain'}</h2>
          <TextField label="Domain" name="domain" required placeholder="invites.yourcompany.com"
            value={domainInput} onChange={(e) => setDomainInput(e.target.value)} error={setDomain.error} />
          <ErrorBox error={setDomain.error} />
          <Button type="submit" busy={setDomain.isPending}>Save domain</Button>
        </form>
      </Card>
    </div>
  )
}
