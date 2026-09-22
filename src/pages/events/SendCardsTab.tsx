// "Send cards" tab: choose who and how, set the wording, see the cost, send,
// and follow the progress live.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/apiClient'
import {
  messageStatusNames, rsvpNames, sendChannelNames, smsParts,
  type EventDetails, type MessageLanguage, type MessageStatus, type RsvpStatus, type SendBatch,
  type SendChannel, type SendingOverview, type SendPreview, type SendRequest, type Who,
} from '../../api/types'
import { Button, Card, ErrorBox, SuccessBox } from '../../components/ui'
import { countOf, isReadOnly } from './eventHelpers'

const whoChoices: { value: Who; label: string }[] = [
  { value: 'NOT_SENT', label: 'Guests not sent yet' },
  { value: 'ALL', label: 'All guests' },
  { value: 'FAILED', label: 'Guests whose card failed' },
  { value: 'FILTER', label: 'Choose by card type, group or RSVP' },
]

const statusOrder: MessageStatus[] = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']

export function SendCardsTab({ event }: { event: EventDetails }) {
  const overview = useQuery({
    queryKey: ['sending', event.id],
    queryFn: () => api.get<SendingOverview>(`/api/events/${event.id}/sending`),
    // While messages are on their way, refresh every 3 seconds to show live progress
    refetchInterval: (query) => {
      const totals = query.state.data?.totals
      return totals && totals.QUEUED + totals.SENDING > 0 ? 3000 : false
    },
  })

  if (overview.isLoading) return <p className="text-ink-soft">Loading…</p>
  if (overview.error || !overview.data) return <ErrorBox error={overview.error} />
  const data = overview.data

  return (
    <div className="space-y-6">
      {data.cannotSendReason && (
        <div className="rounded-lg bg-warning-soft px-4 py-3 text-sm">{data.cannotSendReason}.</div>
      )}
      <ProgressCard totals={data.totals} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SendForm event={event} overview={data} />
        <WordingCard event={event} overview={data} />
      </div>
      <FailuresCard overview={data} />
      <BatchesCard batches={data.recentBatches} />
    </div>
  )
}

function ProgressCard({ totals }: { totals: Record<MessageStatus, number> }) {
  const looks: Partial<Record<MessageStatus, string>> = {
    DELIVERED: 'text-success', READ: 'text-success', FAILED: 'text-danger',
  }
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Progress</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {statusOrder.map((status) => (
          <div key={status} className="rounded-lg bg-paper p-3 text-center">
            <p className={`text-2xl font-semibold ${looks[status] ?? ''}`}>{totals[status]}</p>
            <p className="text-xs text-ink-soft">{messageStatusNames[status]}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SendForm({ event, overview }: { event: EventDetails; overview: SendingOverview }) {
  const queryClient = useQueryClient()
  const [who, setWho] = useState<Who>('NOT_SENT')
  const [channel, setChannel] = useState<SendChannel>('WHATSAPP_THEN_SMS')
  const [cardTypeId, setCardTypeId] = useState('')
  const [group, setGroup] = useState('')
  const [rsvp, setRsvp] = useState<RsvpStatus | ''>('')

  const request: SendRequest = {
    who, channel,
    cardTypeId: who === 'FILTER' && cardTypeId ? cardTypeId : null,
    group: who === 'FILTER' && group ? group : null,
    rsvp: who === 'FILTER' && rsvp ? rsvp : null,
  }

  // The cost preview updates whenever the choice changes
  const preview = useQuery({
    queryKey: ['send-preview', event.id, request, overview.smsText, overview.language],
    queryFn: () => api.post<SendPreview>(`/api/events/${event.id}/sending/preview`, request),
  })

  const send = useMutation({
    mutationFn: () => api.post<SendBatch>(`/api/events/${event.id}/sending`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sending', event.id] })
      queryClient.invalidateQueries({ queryKey: ['send-preview', event.id] })
      queryClient.invalidateQueries({ queryKey: ['guests', event.id] })
      queryClient.invalidateQueries({ queryKey: ['billing'] })
    },
  })

  function askThenSend() {
    const count = preview.data?.guestCount ?? 0
    if (window.confirm(`Send ${countOf(count, 'card')} by ${sendChannelNames[channel]}? This uses up to ${preview.data?.creditsNeeded} credits.`)) {
      send.mutate()
    }
  }

  const result = preview.data
  const canSend = result && !result.cannotSendReason && result.guestCount > 0 && result.enoughCredits

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Send cards</h2>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Who</span>
        <select value={who} onChange={(e) => setWho(e.target.value as Who)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2">
          {whoChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select>
      </label>

      {who === 'FILTER' && (
        <div className="grid gap-2 sm:grid-cols-3">
          <select aria-label="Card type" value={cardTypeId} onChange={(e) => setCardTypeId(e.target.value)}
            className="rounded-lg border border-line bg-white px-2 py-2 text-sm">
            <option value="">Any card type</option>
            {event.cardTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
          <select aria-label="Group" value={group} onChange={(e) => setGroup(e.target.value)}
            className="rounded-lg border border-line bg-white px-2 py-2 text-sm">
            <option value="">Any group</option>
            {event.groups.filter((g) => g.groupName).map((g) => (
              <option key={g.groupName} value={g.groupName ?? ''}>{g.groupName}</option>
            ))}
          </select>
          <select aria-label="RSVP" value={rsvp} onChange={(e) => setRsvp(e.target.value as RsvpStatus | '')}
            className="rounded-lg border border-line bg-white px-2 py-2 text-sm">
            <option value="">Any RSVP</option>
            {(Object.keys(rsvpNames) as RsvpStatus[]).map((status) => (
              <option key={status} value={status}>{rsvpNames[status]}</option>
            ))}
          </select>
        </div>
      )}

      <fieldset className="space-y-1 text-sm">
        <legend className="mb-1 font-medium">How</legend>
        {(Object.keys(sendChannelNames) as SendChannel[]).map((option) => (
          <label key={option} className="flex items-center gap-2">
            <input type="radio" name="channel" checked={channel === option} onChange={() => setChannel(option)} />
            {sendChannelNames[option]}
          </label>
        ))}
      </fieldset>

      {result && (
        <div className="rounded-lg bg-paper p-4 text-sm">
          <p>
            <strong>{countOf(result.guestCount, 'guest')}</strong> · up to <strong>{result.creditsNeeded}</strong> credits
            · you have {result.creditBalance}
          </p>
          {channel === 'WHATSAPP_THEN_SMS' && (
            <p className="text-xs text-ink-soft">An SMS is charged only for guests whose WhatsApp fails.</p>
          )}
          {!result.enoughCredits && (
            <p className="mt-1 text-danger">
              Not enough credits. <Link to="/billing" className="underline">Buy credits</Link>
            </p>
          )}
          {result.skippedCount > 0 && (
            <p className="mt-1 text-ink-soft">{countOf(result.skippedCount, 'guest')} skipped (a message is already on its way).</p>
          )}
        </div>
      )}

      <ErrorBox error={preview.error ?? send.error} />
      {send.isSuccess && <SuccessBox>{countOf(send.data.messageCount, 'card')} queued. You can follow the progress above.</SuccessBox>}
      <Button busy={send.isPending} disabled={!canSend || isReadOnly(event.status)} onClick={askThenSend}>
        Send {result ? countOf(result.guestCount, 'card') : 'cards'}
      </Button>
    </Card>
  )
}

function WordingCard({ event, overview }: { event: EventDetails; overview: SendingOverview }) {
  const queryClient = useQueryClient()
  const [language, setLanguage] = useState<MessageLanguage>(overview.language)
  const [smsText, setSmsText] = useState(overview.smsText ?? '')
  useEffect(() => {
    setLanguage(overview.language)
    setSmsText(overview.smsText ?? '')
  }, [overview.language, overview.smsText])

  const save = useMutation({
    mutationFn: () => api.put<SendingOverview>(`/api/events/${event.id}/message-settings`, { language, smsText: smsText || null }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['sending', event.id], updated)
      queryClient.invalidateQueries({ queryKey: ['send-preview', event.id] })
    },
  })

  const wording = smsText || overview.standardSmsWording
  const changed = language !== overview.language || smsText !== (overview.smsText ?? '')

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Message wording</h2>
      <div className="flex gap-2 text-sm">
        {(['SW', 'EN'] as MessageLanguage[]).map((option) => (
          <button key={option} type="button" onClick={() => setLanguage(option)}
            className={`rounded-full px-3 py-1 ${language === option ? 'bg-brand text-white' : 'ring-1 ring-line'}`}>
            {option === 'SW' ? 'Kiswahili' : 'English'}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">WhatsApp (with the card picture)</p>
        <p className="rounded-lg bg-paper p-3 text-sm text-ink-soft">{overview.whatsAppWording}</p>
        <p className="mt-1 text-xs text-ink-soft">WhatsApp wording is fixed - it is approved by WhatsApp in advance.</p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">SMS text</span>
        <textarea rows={4} maxLength={800} value={smsText} placeholder={overview.standardSmsWording}
          onChange={(e) => setSmsText(e.target.value)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand" />
      </label>
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-ink-soft">Insert:</span>
        {overview.placeholders.map((placeholder) => (
          <button key={placeholder} type="button" onClick={() => setSmsText((smsText || overview.standardSmsWording) + ` {${placeholder}}`)}
            className="rounded bg-paper px-2 py-0.5 ring-1 ring-line hover:bg-brand-soft">{`{${placeholder}}`}</button>
        ))}
      </div>
      <p className="text-xs text-ink-soft">
        About {wording.length} letters before names and links are filled in · roughly {countOf(smsParts(wording), 'SMS part')}.
        Empty = our standard wording.
      </p>
      {save.error && <p className="text-sm text-danger">{(save.error as Error).message}</p>}
      <Button look="secondary" busy={save.isPending} disabled={!changed || isReadOnly(event.status)} onClick={() => save.mutate()}>
        Save wording
      </Button>
    </Card>
  )
}

function FailuresCard({ overview }: { overview: SendingOverview }) {
  if (overview.recentFailures.length === 0) return null
  return (
    <Card>
      <h2 className="mb-1 font-semibold">Recent failures</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Credits for failed messages are given back automatically. To try again, choose "Guests whose card failed" above.
      </p>
      <ul className="space-y-1 text-sm">
        {overview.recentFailures.map((message) => (
          <li key={message.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-1 last:border-0">
            <span>{message.guestName} · {message.toPhone} · {message.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}</span>
            <span className="text-danger">{message.failureReason}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function BatchesCard({ batches }: { batches: SendBatch[] }) {
  if (batches.length === 0) return null
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Sent so far</h2>
      <ul className="space-y-1 text-sm">
        {batches.map((batch) => (
          <li key={batch.id} className="flex flex-wrap justify-between gap-2">
            <span>{new Date(batch.createdAt).toLocaleString()} · {batch.description} · {sendChannelNames[batch.channel]}</span>
            <span className="text-ink-soft">{countOf(batch.messageCount, 'card')} · {batch.creditsCharged} credits</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
