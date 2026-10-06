// "Plan & credits": the company's plan, usage, message credits, buying, and history.
// Owners can buy; managers can only look.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../api/apiClient'
import {
  creditReasonNames, formatTzs, paymentStatusNames,
  type BillingOverview, type CreditStatement, type Payment, type Plan,
} from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Button, Card, ErrorBox, PageTitle } from '../../components/shared'
import { PaymentPanel } from './PaymentPanel'

export function BillingPage() {
  const { me } = useAuth()
  const canPay = me?.role === 'OWNER'
  const overview = useQuery({ queryKey: ['billing'], queryFn: () => api.get<BillingOverview>('/api/billing') })

  if (overview.isLoading) return <p className="text-ink-soft">Loading…</p>
  if (overview.error || !overview.data) return <ErrorBox error={overview.error} />
  const billing = overview.data

  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle title="Plan & credits" subtitle="Your plan decides what you can do. Credits pay for WhatsApp and SMS messages." />

      <PlanStatusBanner billing={billing} />

      {billing.waitingPayments.map((payment) => (
        <PaymentPanel key={payment.id} payment={payment} canPay={canPay} />
      ))}

      <div className="grid gap-6 md:grid-cols-2">
        <CurrentPlanCard billing={billing} />
        <CreditsCard billing={billing} />
      </div>

      <PlanChoices billing={billing} canPay={canPay} />
      <CreditPackChoices billing={billing} canPay={canPay} />
      <PaymentHistory />
      <CreditStatementCard />
    </div>
  )
}

function daysUntil(date: string): number {
  const today = new Date(new Date().toDateString())
  return Math.round((new Date(date).getTime() - today.getTime()) / 86_400_000)
}

function PlanStatusBanner({ billing }: { billing: BillingOverview }) {
  const { planStatus, paidUntil, graceEndsOn, chosenPlanName } = billing
  let message: string | null = null
  if (planStatus === 'ACTIVE' && paidUntil && daysUntil(paidUntil) <= 7) {
    message = `Your ${billing.plan.name} plan ends in ${daysUntil(paidUntil)} days (${new Date(paidUntil).toLocaleDateString()}). Renew to keep your limits.`
  } else if (planStatus === 'IN_GRACE' && graceEndsOn) {
    message = `Your ${billing.plan.name} plan has ended. You have until ${new Date(graceEndsOn).toLocaleDateString()} to renew before Free plan limits apply.`
  } else if (planStatus === 'EXPIRED') {
    message = `Your ${chosenPlanName ?? 'paid'} plan has ended, so Free plan limits now apply. Your existing events still work for guests.`
  }
  if (!message) return null
  return <div className="rounded-lg bg-warning-soft px-4 py-3 text-sm">{message}</div>
}

/** "3 of 5" or "3 (no limit)" */
function usageText(used: number, maximum: number | null): string {
  return maximum === null ? `${used} (no limit)` : `${used} of ${maximum}`
}

function UsageBar({ label, used, maximum }: { label: string; used: number; maximum: number | null }) {
  const percent = maximum ? Math.min(100, (used / maximum) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-ink-soft">{usageText(used, maximum)}</span>
      </div>
      {maximum !== null && (
        <div className="mt-1 h-2 rounded-full bg-line">
          <div className={`h-2 rounded-full ${percent >= 100 ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  )
}

function CurrentPlanCard({ billing }: { billing: BillingOverview }) {
  const { plan, usage, paidUntil, planStatus } = billing
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm text-ink-soft">Current plan</p>
        <p className="text-2xl font-semibold">{plan.name}</p>
        {paidUntil && planStatus !== 'EXPIRED' && (
          <p className="text-sm text-ink-soft">Paid until {new Date(paidUntil).toLocaleDateString()}</p>
        )}
      </div>
      <UsageBar label="Active events" used={usage.activeEvents} maximum={usage.maxActiveEvents} />
      <UsageBar label="People who can log in" used={usage.staff} maximum={usage.maxStaff} />
      <p className="text-sm">
        Guests per event: <strong>{usage.maxGuestsPerEvent ?? 'no limit'}</strong>
        {' · '}Own card artwork: <strong>{plan.allowsOwnArtwork ? 'yes' : 'no'}</strong>
        {' · '}Custom domain: <strong>{plan.allowsCustomDomain ? 'yes' : 'no'}</strong>
      </p>
    </Card>
  )
}

function CreditsCard({ billing }: { billing: BillingOverview }) {
  return (
    <Card className="space-y-3">
      <p className="text-sm text-ink-soft">Message credits</p>
      <p className="text-4xl font-semibold">{billing.creditBalance.toLocaleString('en-US')}</p>
      <ul className="text-sm text-ink-soft">
        {billing.messagePrices.map((price) => (
          <li key={price.channel}>
            {price.channel === 'WHATSAPP' ? 'WhatsApp card' : 'SMS (per 160 letters)'}: {price.credits}{' '}
            {price.credits === 1 ? 'credit' : 'credits'}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-soft">Credits never expire.</p>
    </Card>
  )
}

/** Starts a payment; the new payment then appears at the top of the page with how to pay. */
function useStartPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: { type: 'PLAN'; planId: string; months: number } | { type: 'CREDITS'; creditPackId: string }) =>
      api.post<Payment>('/api/billing/payments', order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })
}

function limitText(value: number | null, word: string): string {
  return value === null ? `Unlimited ${word}` : `${value.toLocaleString('en-US')} ${word}`
}

function PlanChoices({ billing, canPay }: { billing: BillingOverview; canPay: boolean }) {
  const [months, setMonths] = useState(1)
  const startPayment = useStartPayment()
  const paidPlans = billing.plansForSale.filter((plan) => !plan.freePlan)

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Plans</h2>
        {canPay && (
          <label className="flex items-center gap-2 text-sm">
            Pay for
            <select value={months} onChange={(e) => setMonths(Number(e.target.value))}
              className="rounded-lg border border-line bg-card px-2 py-1">
              {[1, 3, 6, 12].map((count) => (
                <option key={count} value={count}>{count} {count === 1 ? 'month' : 'months'}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {billing.plansForSale.map((plan: Plan) => {
          const isCurrent = plan.id === billing.plan.id
          return (
            <div key={plan.id} className={`rounded-xl border p-5 ${isCurrent ? 'border-brand ring-2 ring-brand/20' : 'border-line'}`}>
              <p className="font-semibold">{plan.name}</p>
              <p className="mt-1 text-2xl font-semibold">
                {plan.freePlan ? 'Free' : formatTzs(plan.monthlyPriceTzs)}
                {!plan.freePlan && <span className="text-sm font-normal text-ink-soft"> / month</span>}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>{limitText(plan.maxActiveEvents, plan.maxActiveEvents === 1 ? 'active event' : 'active events')}</li>
                <li>{limitText(plan.maxGuestsPerEvent, 'guests per event')}</li>
                <li>{limitText(plan.maxStaff, plan.maxStaff === 1 ? 'login' : 'logins')}</li>
                <li className={plan.allowsOwnArtwork ? '' : 'text-ink-soft line-through'}>Your own card artwork</li>
                <li className={plan.allowsCustomDomain ? '' : 'text-ink-soft line-through'}>Your own domain</li>
              </ul>
              {isCurrent && <p className="mt-4 text-sm font-medium text-brand">Your current plan</p>}
              {canPay && !plan.freePlan && (
                <Button className="mt-4 w-full" look={isCurrent ? 'secondary' : 'primary'} busy={startPayment.isPending}
                  onClick={() => startPayment.mutate({ type: 'PLAN', planId: plan.id, months })}>
                  {isCurrent ? 'Renew' : 'Choose'} · {formatTzs(plan.monthlyPriceTzs * months)}
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {paidPlans.length > 0 && (
        <p className="text-xs text-ink-soft">
          Renewing the same plan adds the months on top. Choosing a different plan starts it today.
        </p>
      )}
      <ErrorBox error={startPayment.error} />
    </Card>
  )
}

function CreditPackChoices({ billing, canPay }: { billing: BillingOverview; canPay: boolean }) {
  const startPayment = useStartPayment()
  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Buy message credits</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {billing.packsForSale.map((pack) => (
          <div key={pack.id} className="rounded-xl border border-line p-5">
            <p className="text-2xl font-semibold">{pack.credits.toLocaleString('en-US')}</p>
            <p className="text-sm text-ink-soft">credits</p>
            <p className="mt-2 font-medium">{formatTzs(pack.priceTzs)}</p>
            {canPay && (
              <Button className="mt-3 w-full" look="secondary" busy={startPayment.isPending}
                onClick={() => startPayment.mutate({ type: 'CREDITS', creditPackId: pack.id })}>
                Buy
              </Button>
            )}
          </div>
        ))}
      </div>
      <ErrorBox error={startPayment.error} />
    </Card>
  )
}

function PaymentHistory() {
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => api.get<Payment[]>('/api/billing/payments') })
  if (!payments.data || payments.data.length === 0) return null
  return (
    <Card className="overflow-x-auto p-0">
      <h2 className="px-6 pt-5 font-semibold">Payments</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="border-b border-line text-ink-soft">
          <tr>
            <th className="px-6 py-2 font-medium">Date</th>
            <th className="px-6 py-2 font-medium">What</th>
            <th className="px-6 py-2 font-medium">Amount</th>
            <th className="px-6 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.data.map((payment) => (
            <tr key={payment.id} className="border-b border-line last:border-0">
              <td className="px-6 py-2 whitespace-nowrap">{new Date(payment.createdAt).toLocaleDateString()}</td>
              <td className="px-6 py-2">
                {payment.description} <span className="text-ink-soft">({payment.reference})</span>
                {payment.adminNote && <p className="text-xs text-danger">{payment.adminNote}</p>}
              </td>
              <td className="px-6 py-2 whitespace-nowrap">{formatTzs(payment.amountTzs)}</td>
              <td className="px-6 py-2">{paymentStatusNames[payment.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function CreditStatementCard() {
  const [page, setPage] = useState(0)
  const statement = useQuery({
    queryKey: ['credit-movements', page],
    queryFn: () => api.get<CreditStatement>(`/api/billing/credit-movements?page=${page}`),
  })
  if (!statement.data || statement.data.movements.length === 0) return null
  return (
    <Card className="overflow-x-auto p-0">
      <h2 className="px-6 pt-5 font-semibold">Credit statement</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="border-b border-line text-ink-soft">
          <tr>
            <th className="px-6 py-2 font-medium">Date</th>
            <th className="px-6 py-2 font-medium">What happened</th>
            <th className="px-6 py-2 text-right font-medium">Credits</th>
            <th className="px-6 py-2 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {statement.data.movements.map((movement) => (
            <tr key={movement.id} className="border-b border-line last:border-0">
              <td className="px-6 py-2 whitespace-nowrap">{new Date(movement.createdAt).toLocaleString()}</td>
              <td className="px-6 py-2">
                {creditReasonNames[movement.reason]}
                {movement.note && <span className="text-ink-soft"> – {movement.note}</span>}
              </td>
              <td className={`px-6 py-2 text-right ${movement.amount < 0 ? 'text-danger' : 'text-success'}`}>
                {movement.amount > 0 ? '+' : ''}{movement.amount.toLocaleString('en-US')}
              </td>
              <td className="px-6 py-2 text-right">{movement.balanceAfter.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {statement.data.totalPages > 1 && (
        <div className="flex gap-2 px-6 py-3">
          <Button look="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Newer</Button>
          <Button look="secondary" disabled={page + 1 >= statement.data.totalPages} onClick={() => setPage(page + 1)}>Older</Button>
        </div>
      )}
    </Card>
  )
}
