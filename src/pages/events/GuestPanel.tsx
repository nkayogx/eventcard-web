// The side form for adding a new guest, or editing / removing an existing one.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../../api/apiClient'
import type { EventDetails, Guest } from '../../api/types'
import { Button, Card, ErrorBox, SelectField, TextField } from '../../components/ui'

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
