// The side form for adding a new guest, or editing / removing an existing one.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../../api/apiClient'
import { messageStatusNames, sendChannelNames, type EventDetails, type Guest, type MessageDetails, type SendChannel } from '../../api/types'
import { Button, Card, ErrorBox, SelectField, TextField } from '../../components/shared'

interface Props {
  event: EventDetails
  guest?: Guest // leave out to add a new guest
  onClose: () => void
}

export function GuestPanel({ event, guest, onClose }: Props) {
  const queryClient = useQueryClient()
  const isEditing = guest !== undefined
  const [form, setForm] = useState({
    nameOnCard: guest?.nameOnCard ?? '',
    phone: guest?.phone ?? '',
    cardTypeId: guest?.cardTypeId ?? event.cardTypes[0]?.id ?? '',
    groupName: guest?.groupName ?? '',
    notes: guest?.notes ?? '',
  })

  // After any change, reload the guest list and the event totals
  function refreshLists() {
    queryClient.invalidateQueries({ queryKey: ['guests', event.id] })
    queryClient.invalidateQueries({ queryKey: ['event', event.id] })
  }

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, groupName: form.groupName || null, notes: form.notes || null }
      return isEditing
        ? api.put<Guest>(`/api/events/${event.id}/guests/${guest.id}`, body)
        : api.post<Guest>(`/api/events/${event.id}/guests`, body)
    },
    onSuccess: () => {
      refreshLists()
      if (isEditing) {
        onClose()
      } else {
        // Keep the form open for the next guest, keeping the card type and group
        setForm({ ...form, nameOnCard: '', phone: '', notes: '' })
      }
    },
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/events/${event.id}/guests/${guest?.id}`),
    onSuccess: () => {
      refreshLists()
      onClose()
    },
  })

  function update(field: keyof typeof form, value: string) {
    setForm({ ...form, [field]: value })
  }

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    save.mutate()
  }

  const cardTypeChoices = event.cardTypes.map((cardType) => ({
    value: cardType.id,
    label: `${cardType.name} (${cardType.seats} ${cardType.seats === 1 ? 'seat' : 'seats'})`,
  }))

  return (
    <Card className="lg:sticky lg:top-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{isEditing ? 'Edit guest' : 'Add guest'}</h2>
          <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">Close</button>
        </div>
        <TextField label="Name on card" name="nameOnCard" required placeholder="Mr & Mrs Juma" autoFocus
          value={form.nameOnCard} onChange={(e) => update('nameOnCard', e.target.value)} error={save.error} />
        <TextField label="Phone" name="phone" required placeholder="0712 345 678"
          hint="Used to send the card on WhatsApp or SMS"
          value={form.phone} onChange={(e) => update('phone', e.target.value)} error={save.error} />
        <SelectField label="Card type" name="cardTypeId" options={cardTypeChoices}
          value={form.cardTypeId} onChange={(e) => update('cardTypeId', e.target.value)} error={save.error} />
        <TextField label="Group (optional)" name="groupName" placeholder="Bride's side" list="guest-groups"
          value={form.groupName} onChange={(e) => update('groupName', e.target.value)} error={save.error} />
        <datalist id="guest-groups">
          {event.groups.filter((group) => group.groupName).map((group) => (
            <option key={group.groupName} value={group.groupName ?? ''} />
          ))}
        </datalist>
        <TextField label="Notes (optional)" name="notes"
          value={form.notes} onChange={(e) => update('notes', e.target.value)} error={save.error} />

        <ErrorBox error={save.error ?? remove.error} />
        {isEditing && guest && <SendToGuest event={event} guest={guest} />}
        {save.isSuccess && !isEditing && <p className="text-sm text-success">Guest added. Add the next one.</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" busy={save.isPending}>{isEditing ? 'Save' : 'Add guest'}</Button>
          {isEditing && (
            <Button type="button" look="danger" busy={remove.isPending} onClick={() => remove.mutate()}>Remove</Button>
          )}
        </div>
      </form>
    </Card>
  )
}

/** Send or resend this guest's card, and see the messages sent to them so far. */
function SendToGuest({ event, guest }: { event: EventDetails; guest: Guest }) {
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<SendChannel>('WHATSAPP_THEN_SMS')
  const history = useQuery({
    queryKey: ['guest-messages', guest.id],
    queryFn: () => api.get<MessageDetails[]>(`/api/events/${event.id}/guests/${guest.id}/messages`),
  })
  const send = useMutation({
    mutationFn: () => api.post<MessageDetails>(`/api/events/${event.id}/guests/${guest.id}/send`, { channel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-messages', guest.id] })
      queryClient.invalidateQueries({ queryKey: ['guests', event.id] })
      queryClient.invalidateQueries({ queryKey: ['sending', event.id] })
    },
  })

  if (event.status !== 'ACTIVE') {
    return <p className="border-t border-line pt-3 text-xs text-ink-soft">Activate the event to send this guest's card.</p>
  }

  return (
    <div className="space-y-2 border-t border-line pt-4">
      <p className="text-sm font-medium">{guest.cardStatus ? 'Resend card' : 'Send card'}</p>
      <div className="flex gap-2">
        <select aria-label="Send by" value={channel} onChange={(e) => setChannel(e.target.value as SendChannel)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1.5 text-sm">
          {(Object.keys(sendChannelNames) as SendChannel[]).map((option) => (
            <option key={option} value={option}>{sendChannelNames[option]}</option>
          ))}
        </select>
        <Button type="button" look="secondary" busy={send.isPending} onClick={() => send.mutate()}>Send</Button>
      </div>
      <ErrorBox error={send.error} />
      {history.data && history.data.length > 0 && (
        <ul className="space-y-1 text-xs">
          {history.data.map((message) => (
            <li key={message.id} className="flex justify-between gap-2">
              <span>{new Date(message.queuedAt).toLocaleString()} · {message.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}</span>
              <span className={message.status === 'FAILED' ? 'text-danger' : 'text-ink-soft'} title={message.failureReason ?? undefined}>
                {messageStatusNames[message.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
