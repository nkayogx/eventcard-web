// Create a new event, or edit an existing one (when the address has an event id).

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/apiClient'
import { eventTypeNames, type EventDetails, type EventType } from '../../api/types'
import { Button, Card, ErrorBox, PageTitle, SelectField, TextField } from '../../components/ui'
import { useEvent } from './eventHelpers'

interface EventForm {
  name: string
  eventType: EventType
  hostNames: string
  startsAt: string
  endsAt: string
  venueName: string
  venueAddress: string
  mapLink: string
  dressCode: string
  extraInfo: string
  contactPhone: string
  rsvpDeadline: string
}

const emptyForm: EventForm = {
  name: '', eventType: 'WEDDING', hostNames: '', startsAt: '', endsAt: '', venueName: '', venueAddress: '',
  mapLink: '', dressCode: '', extraInfo: '', contactPhone: '', rsvpDeadline: '',
}

const eventTypeChoices = Object.entries(eventTypeNames).map(([value, label]) => ({ value, label }))

/** The date-time boxes want "2026-12-12T16:00" (no seconds). */
function forDateTimeBox(value: string | null): string {
  return value ? value.slice(0, 16) : ''
}

function toForm(event: EventDetails): EventForm {
  return {
    name: event.name,
    eventType: event.eventType,
    hostNames: event.hostNames ?? '',
    startsAt: forDateTimeBox(event.startsAt),
    endsAt: forDateTimeBox(event.endsAt),
    venueName: event.venueName,
    venueAddress: event.venueAddress ?? '',
    mapLink: event.mapLink ?? '',
    dressCode: event.dressCode ?? '',
    extraInfo: event.extraInfo ?? '',
    contactPhone: event.contactPhone ?? '',
    rsvpDeadline: event.rsvpDeadline ?? '',
  }
}

/** Empty boxes are sent as "nothing" (null), not as empty text. */
function toRequest(form: EventForm) {
  const orNull = (value: string) => (value.trim() === '' ? null : value)
  return {
    ...form,
    hostNames: orNull(form.hostNames),
    endsAt: orNull(form.endsAt),
    venueAddress: orNull(form.venueAddress),
    mapLink: orNull(form.mapLink),
    dressCode: orNull(form.dressCode),
    extraInfo: orNull(form.extraInfo),
    contactPhone: orNull(form.contactPhone),
    rsvpDeadline: orNull(form.rsvpDeadline),
  }
}

export function EventFormPage() {
  const { eventId } = useParams()
  const isEditing = eventId !== undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const existingEvent = useEvent(eventId)
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [formFilled, setFormFilled] = useState(!isEditing)

  // When editing, fill the form once the event has loaded
  useEffect(() => {
    if (isEditing && existingEvent.data && !formFilled) {
      setForm(toForm(existingEvent.data))
      setFormFilled(true)
    }
  }, [isEditing, existingEvent.data, formFilled])

  const save = useMutation({
    mutationFn: () =>
      isEditing
        ? api.put<EventDetails>(`/api/events/${eventId}`, toRequest(form))
        : api.post<EventDetails>('/api/events', toRequest(form)),
    onSuccess: (saved) => {
      queryClient.setQueryData(['event', saved.id], saved)
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate(`/events/${saved.id}`)
    },
  })

  function update(field: keyof EventForm, value: string) {
    setForm({ ...form, [field]: value })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  if (isEditing && !formFilled) return <p className="text-ink-soft">Loading…</p>

  return (
    <div className="max-w-3xl">
      <PageTitle title={isEditing ? 'Edit event' : 'New event'} />
      <form onSubmit={submit} className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-semibold">About the event</h2>
          <TextField label="Event name" name="name" required placeholder="Asha & Baraka's Wedding"
            value={form.name} onChange={(e) => update('name', e.target.value)} error={save.error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Type of event" name="eventType" options={eventTypeChoices} value={form.eventType}
              onChange={(e) => update('eventType', e.target.value)} error={save.error} />
            <TextField label="Hosted by (optional)" name="hostNames" placeholder="Mr & Mrs Salim"
              value={form.hostNames} onChange={(e) => update('hostNames', e.target.value)} error={save.error} />
            <TextField label="Starts" name="startsAt" type="datetime-local" required
              value={form.startsAt} onChange={(e) => update('startsAt', e.target.value)} error={save.error} />
            <TextField label="Ends (optional)" name="endsAt" type="datetime-local"
              value={form.endsAt} onChange={(e) => update('endsAt', e.target.value)} error={save.error} />
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold">Venue</h2>
          <TextField label="Venue name" name="venueName" required placeholder="Serena Hotel"
            value={form.venueName} onChange={(e) => update('venueName', e.target.value)} error={save.error} />
          <TextField label="Address (optional)" name="venueAddress"
            value={form.venueAddress} onChange={(e) => update('venueAddress', e.target.value)} error={save.error} />
          <TextField label="Map link (optional)" name="mapLink" placeholder="https://maps.google.com/…"
            hint="Paste a Google Maps link so guests can find the venue"
            value={form.mapLink} onChange={(e) => update('mapLink', e.target.value)} error={save.error} />
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold">Extra details (all optional)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Dress code" name="dressCode" placeholder="Smart casual"
              value={form.dressCode} onChange={(e) => update('dressCode', e.target.value)} error={save.error} />
            <TextField label="Contact phone for questions" name="contactPhone" placeholder="0712 345 678"
              value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} error={save.error} />
            <TextField label="RSVP deadline" name="rsvpDeadline" type="date"
              value={form.rsvpDeadline} onChange={(e) => update('rsvpDeadline', e.target.value)} error={save.error} />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Extra information</span>
            <textarea
              name="extraInfo" rows={4} maxLength={2000} placeholder="Programme, parking, gifts…"
              value={form.extraInfo} onChange={(e) => update('extraInfo', e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
        </Card>

        <ErrorBox error={save.error} />
        <div className="flex gap-3">
          <Button type="submit" busy={save.isPending}>{isEditing ? 'Save changes' : 'Create event'}</Button>
          <Button type="button" look="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
