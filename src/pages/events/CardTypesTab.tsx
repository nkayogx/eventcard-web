// Card types tab: Single, Double, VIP... and how many seats each gives.

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../../api/apiClient'
import type { CardTypeDetails, EventDetails } from '../../api/types'
import { Button, Card, ErrorBox, TextField } from '../../components/shared'
import { countOf, isReadOnly, useCanEditEvents } from './eventHelpers'

export function CardTypesTab({ event }: { event: EventDetails }) {
  const canChange = useCanEditEvents() && !isReadOnly(event.status)

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-ink-soft">
        Each guest gets one card. The card type decides how many people the card lets in.
      </p>

      <Card className="p-0">
        <ul>
          {event.cardTypes.map((cardType) => (
            <CardTypeRow key={cardType.id} eventId={event.id} cardType={cardType} canChange={canChange} />
          ))}
        </ul>
      </Card>

      {canChange && <AddCardTypeForm eventId={event.id} />}
    </div>
  )
}

/** Every card type change answers with the whole event, so we just store that. */
function useSaveEvent(eventId: string) {
  const queryClient = useQueryClient()
  return (updated: EventDetails) => queryClient.setQueryData(['event', eventId], updated)
}

function CardTypeRow({ eventId, cardType, canChange }: { eventId: string; cardType: CardTypeDetails; canChange: boolean }) {
  const saveEvent = useSaveEvent(eventId)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(cardType.name)
  const [seats, setSeats] = useState(String(cardType.seats))

  const update = useMutation({
    mutationFn: () =>
      api.put<EventDetails>(`/api/events/${eventId}/card-types/${cardType.id}`, { name, seats: Number(seats) }),
    onSuccess: (updated) => {
      saveEvent(updated)
      setEditing(false)
    },
  })
  const remove = useMutation({
    mutationFn: () => api.delete<EventDetails>(`/api/events/${eventId}/card-types/${cardType.id}`),
    onSuccess: saveEvent,
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    update.mutate()
  }

  if (editing) {
    return (
      <li className="border-b border-line p-4 last:border-0">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
          <TextField label="Name" name="name" required value={name} onChange={(e) => setName(e.target.value)} error={update.error} />
          <TextField label="Seats" name="seats" type="number" min={1} max={50} required value={seats}
            onChange={(e) => setSeats(e.target.value)} error={update.error} />
          <div className="flex gap-2">
            <Button type="submit" busy={update.isPending}>Save</Button>
            <Button type="button" look="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
        <div className="mt-2"><ErrorBox error={update.error} /></div>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 last:border-0">
      <div>
        <p className="font-medium">{cardType.name}</p>
        <p className="text-sm text-ink-soft">
          {countOf(cardType.seats, 'seat')} per card · used by {countOf(cardType.cards, 'guest')}
        </p>
        {remove.error && <p className="mt-1 text-sm text-danger">{(remove.error as Error).message}</p>}
      </div>
      {canChange && (
        <div className="flex gap-2">
          <Button look="secondary" onClick={() => setEditing(true)}>Edit</Button>
          <Button look="danger" busy={remove.isPending} onClick={() => remove.mutate()}>Remove</Button>
        </div>
      )}
    </li>
  )
}

function AddCardTypeForm({ eventId }: { eventId: string }) {
  const saveEvent = useSaveEvent(eventId)
  const [name, setName] = useState('')
  const [seats, setSeats] = useState('2')

  const add = useMutation({
    mutationFn: () => api.post<EventDetails>(`/api/events/${eventId}/card-types`, { name, seats: Number(seats) }),
    onSuccess: (updated) => {
      saveEvent(updated)
      setName('')
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    add.mutate()
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="font-semibold">Add a card type</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
          <TextField label="Name" name="name" required placeholder="VIP" value={name}
            onChange={(e) => setName(e.target.value)} error={add.error} />
          <TextField label="Seats" name="seats" type="number" min={1} max={50} required value={seats}
            onChange={(e) => setSeats(e.target.value)} error={add.error} />
          <Button type="submit" busy={add.isPending}>Add</Button>
        </div>
        <ErrorBox error={add.error} />
      </form>
    </Card>
  )
}
