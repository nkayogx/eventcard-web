// Platform admin: plans, credit packs and message prices.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../../api/apiClient'
import { formatTzs, type CreditPack, type MessagePrice, type Plan } from '../../api/types'
import { Button, Card, ErrorBox, PageTitle, TextField } from '../../components/ui'

export function PlatformPricingPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle title="Plans & prices" subtitle="Changes apply to new purchases. Payments already made keep their price." />
      <PlansSection />
      <CreditPacksSection />
      <MessagePricesSection />
    </div>
  )
}

// ---------- Plans ----------

type PlanForm = Omit<Plan, 'id' | 'freePlan'>

const newPlan: PlanForm = {
  code: '', name: '', monthlyPriceTzs: 0, maxActiveEvents: null, maxGuestsPerEvent: null, maxStaff: null,
  allowsCustomDomain: false, allowsOwnArtwork: false, available: true, sortOrder: 10,
}

/** Empty box = unlimited (null). */
function numberOrNull(text: string): number | null {
  return text.trim() === '' ? null : Number(text)
}

function PlansSection() {
  const plans = useQuery({ queryKey: ['platform-plans'], queryFn: () => api.get<Plan[]>('/api/platform/plans') })
  const [editing, setEditing] = useState<Plan | 'new' | null>(null)

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Plans</h2>
        <Button look="secondary" onClick={() => setEditing('new')}>Add plan</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-2 pr-4 font-medium">Plan</th>
              <th className="py-2 pr-4 font-medium">Price / month</th>
              <th className="py-2 pr-4 font-medium">Active events</th>
              <th className="py-2 pr-4 font-medium">Guests / event</th>
              <th className="py-2 pr-4 font-medium">Logins</th>
              <th className="py-2 pr-4 font-medium">Artwork · Domain</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {plans.data?.map((plan) => (
              <tr key={plan.id} className="border-t border-line">
                <td className="py-2 pr-4">
                  {plan.name} <span className="text-ink-soft">({plan.code})</span>
                  {!plan.available && <span className="ml-1 text-xs text-danger">not on sale</span>}
                </td>
                <td className="py-2 pr-4">{formatTzs(plan.monthlyPriceTzs)}</td>
                <td className="py-2 pr-4">{plan.maxActiveEvents ?? '∞'}</td>
                <td className="py-2 pr-4">{plan.maxGuestsPerEvent ?? '∞'}</td>
                <td className="py-2 pr-4">{plan.maxStaff ?? '∞'}</td>
                <td className="py-2 pr-4">{plan.allowsOwnArtwork ? '✔' : '–'} · {plan.allowsCustomDomain ? '✔' : '–'}</td>
                <td className="py-2 text-right">
                  <button onClick={() => setEditing(plan)} className="text-brand hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <PlanEditor key={editing === 'new' ? 'new' : editing.id} plan={editing === 'new' ? null : editing}
          onDone={() => setEditing(null)} />
      )}
    </Card>
  )
}

function PlanEditor({ plan, onDone }: { plan: Plan | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<PlanForm>(plan ?? newPlan)

  const save = useMutation({
    mutationFn: () => (plan ? api.put<Plan>(`/api/platform/plans/${plan.id}`, form) : api.post<Plan>('/api/platform/plans', form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] })
      onDone()
    },
  })

  function update<K extends keyof PlanForm>(field: K, value: PlanForm[K]) {
    setForm({ ...form, [field]: value })
  }

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg bg-paper p-4">
      <h3 className="font-medium">{plan ? `Edit ${plan.name}` : 'New plan'}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Code" name="code" required value={form.code} error={save.error}
          onChange={(e) => update('code', e.target.value.toUpperCase())} />
        <TextField label="Name" name="name" required value={form.name} error={save.error}
          onChange={(e) => update('name', e.target.value)} />
        <TextField label="Price per month (TSh)" name="monthlyPriceTzs" type="number" min={0} value={form.monthlyPriceTzs}
          error={save.error} onChange={(e) => update('monthlyPriceTzs', Number(e.target.value))} />
        <TextField label="Active events (empty = unlimited)" name="maxActiveEvents" type="number" min={1}
          value={form.maxActiveEvents ?? ''} error={save.error}
          onChange={(e) => update('maxActiveEvents', numberOrNull(e.target.value))} />
        <TextField label="Guests per event (empty = unlimited)" name="maxGuestsPerEvent" type="number" min={1}
          value={form.maxGuestsPerEvent ?? ''} error={save.error}
          onChange={(e) => update('maxGuestsPerEvent', numberOrNull(e.target.value))} />
        <TextField label="Logins (empty = unlimited)" name="maxStaff" type="number" min={1}
          value={form.maxStaff ?? ''} error={save.error} onChange={(e) => update('maxStaff', numberOrNull(e.target.value))} />
        <TextField label="Order on the page" name="sortOrder" type="number" value={form.sortOrder} error={save.error}
          onChange={(e) => update('sortOrder', Number(e.target.value))} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.allowsOwnArtwork} onChange={(e) => update('allowsOwnArtwork', e.target.checked)} />
          Own card artwork
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.allowsCustomDomain} onChange={(e) => update('allowsCustomDomain', e.target.checked)} />
          Custom domain
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.available} onChange={(e) => update('available', e.target.checked)} />
          On sale
        </label>
      </div>
      <ErrorBox error={save.error} />
      <div className="flex gap-2">
        <Button type="submit" busy={save.isPending}>Save plan</Button>
        <Button type="button" look="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}

// ---------- Credit packs ----------

function CreditPacksSection() {
  const queryClient = useQueryClient()
  const packs = useQuery({ queryKey: ['platform-packs'], queryFn: () => api.get<CreditPack[]>('/api/platform/credit-packs') })
  const [form, setForm] = useState({ name: '', credits: 100, priceTzs: 5000 })

  const add = useMutation({
    mutationFn: () => api.post<CreditPack>('/api/platform/credit-packs', { ...form, available: true, sortOrder: 10 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-packs'] }),
  })
  const toggle = useMutation({
    mutationFn: (pack: CreditPack) => api.put<CreditPack>(`/api/platform/credit-packs/${pack.id}`, { ...pack, available: !pack.available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-packs'] }),
  })

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    add.mutate()
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Credit packs</h2>
      <ul className="space-y-2 text-sm">
        {packs.data?.map((pack) => (
          <li key={pack.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {pack.name}: {pack.credits.toLocaleString('en-US')} credits for {formatTzs(pack.priceTzs)}
              {!pack.available && <span className="ml-1 text-xs text-danger">not on sale</span>}
            </span>
            <button onClick={() => toggle.mutate(pack)} className="text-brand hover:underline">
              {pack.available ? 'Stop selling' : 'Sell again'}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_120px_140px_auto] sm:items-end">
        <TextField label="Name" name="name" required placeholder="1,000 credits" value={form.name} error={add.error}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField label="Credits" name="credits" type="number" min={1} value={form.credits} error={add.error}
          onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        <TextField label="Price (TSh)" name="priceTzs" type="number" min={1} value={form.priceTzs} error={add.error}
          onChange={(e) => setForm({ ...form, priceTzs: Number(e.target.value) })} />
        <Button type="submit" busy={add.isPending}>Add pack</Button>
      </form>
      <ErrorBox error={add.error ?? toggle.error} />
    </Card>
  )
}

// ---------- Message prices ----------

function MessagePricesSection() {
  const prices = useQuery({ queryKey: ['platform-prices'], queryFn: () => api.get<MessagePrice[]>('/api/platform/message-prices') })
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Credits per message</h2>
      <p className="text-sm text-ink-soft">What one message costs the vendor. SMS is per 160-letter part.</p>
      {prices.data?.map((price) => <MessagePriceRow key={price.channel} price={price} />)}
    </Card>
  )
}

function MessagePriceRow({ price }: { price: MessagePrice }) {
  const queryClient = useQueryClient()
  const [credits, setCredits] = useState(price.credits)
  const save = useMutation({
    mutationFn: () => api.put<MessagePrice>(`/api/platform/message-prices/${price.channel}`, { credits }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-prices'] }),
  })
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24">{price.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}</span>
      <input type="number" min={0} max={100} value={credits} onChange={(e) => setCredits(Number(e.target.value))}
        aria-label={`${price.channel} credits`} className="w-20 rounded-lg border border-line px-2 py-1" />
      <span>credits</span>
      <Button look="secondary" busy={save.isPending} disabled={credits === price.credits} onClick={() => save.mutate()}>Save</Button>
    </div>
  )
}
