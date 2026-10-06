// Overview tab: the event's details, status buttons, and totals.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/apiClient'
import type { ArrivalSummary, EventDetails, EventStatus } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Button, Card, ErrorBox } from '../../components/shared'
import { countOf, formatEventDate, isReadOnly, useCanEditEvents } from './eventHelpers'

/** The button text for moving to each status, and what we ask before doing it. */
const statusActions: Record<EventStatus, { label: string; question: string }> = {
  ACTIVE: { label: 'Activate event', question: 'Activate this event? Cards can then be sent to guests.' },
  FINISHED: { label: 'Mark as finished', question: 'Mark this event as finished? It will become read-only.' },
  CANCELLED: { label: 'Cancel event', question: 'Cancel this event? It will become read-only.' },
  DRAFT: { label: 'Back to draft', question: 'Move this event back to draft?' },
}

export function OverviewTab({ event }: { event: EventDetails }) {
  const { me } = useAuth()
  const canEdit = useCanEditEvents()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const changeStatus = useMutation({
    mutationFn: (status: EventStatus) => api.put<EventDetails>(`/api/events/${event.id}/status`, { status }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['event', event.id], updated)
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const deleteEvent = useMutation({
    mutationFn: () => api.delete(`/api/events/${event.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate('/events')
    },
  })

  function askThenChangeStatus(status: EventStatus) {
    if (window.confirm(statusActions[status].question)) changeStatus.mutate(status)
  }

  function askThenDelete() {
    if (window.confirm('Delete this draft event and its whole guest list? This cannot be undone.')) deleteEvent.mutate()
  }

  const details: [string, string | null][] = [
    ['Hosted by', event.hostNames],
    ['Starts', formatEventDate(event.startsAt)],
    ['Ends', event.endsAt ? formatEventDate(event.endsAt) : null],
    ['Venue', [event.venueName, event.venueAddress].filter(Boolean).join(', ')],
    ['Dress code', event.dressCode],
    ['Contact phone', event.contactPhone],
    ['RSVP by', event.rsvpDeadline ? new Date(event.rsvpDeadline).toLocaleDateString() : null],
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Details</h2>
            {canEdit && !isReadOnly(event.status) && (
              <Link to={`/events/${event.id}/edit`} className="text-sm text-brand hover:underline">Edit</Link>
            )}
          </div>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[140px_1fr]">
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-ink-soft">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            {event.mapLink && (
              <div className="contents">
                <dt className="text-ink-soft">Map</dt>
                <dd>
                  <a href={event.mapLink} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    Open map
                  </a>
                </dd>
              </div>
            )}
          </dl>
          {event.extraInfo && <p className="mt-4 whitespace-pre-line text-sm">{event.extraInfo}</p>}
        </Card>

        {canEdit && (event.allowedNextStatuses.length > 0 || event.status === 'DRAFT') && (
          <Card className="space-y-3">
            <h2 className="font-semibold">Event status</h2>
            {event.status === 'DRAFT' && (
              <p className="text-sm text-ink-soft">
                This event is a draft. Activate it when the guest list and card are ready.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {event.allowedNextStatuses.map((status) => (
                <Button key={status} look={status === 'CANCELLED' ? 'danger' : status === 'ACTIVE' ? 'primary' : 'secondary'}
                  busy={changeStatus.isPending} onClick={() => askThenChangeStatus(status)}>
                  {statusActions[status].label}
                </Button>
              ))}
              {event.status === 'DRAFT' && me?.role === 'OWNER' && (
                <Button look="danger" busy={deleteEvent.isPending} onClick={askThenDelete}>Delete draft</Button>
              )}
            </div>
            <ErrorBox error={changeStatus.error ?? deleteEvent.error} />
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold">Guest list</h2>
          <p className="mt-2 text-3xl font-semibold">{event.totalCards}</p>
          <p className="text-sm text-ink-soft">{event.totalCards === 1 ? 'card' : 'cards'} · {countOf(event.totalSeats, 'seat')}</p>
          <ul className="mt-4 space-y-1 text-sm">
            {event.cardTypes.map((cardType) => (
              <li key={cardType.id} className="flex justify-between">
                <span>{cardType.name}</span>
                <span className="text-ink-soft">{countOf(cardType.cards, 'card')} · {countOf(cardType.seatsUsed, 'seat')}</span>
              </li>
            ))}
          </ul>
        </Card>

        {event.status !== 'DRAFT' && <ArrivalsCard eventId={event.id} />}

        <Card>
          <h2 className="font-semibold">RSVP answers</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li className="flex justify-between">
              <span>Attending</span>
              <span className="text-ink-soft">
                {countOf(event.rsvp.attendingCards, 'card')} · {countOf(event.rsvp.attendingPeople, 'person', 'people')}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Not attending</span>
              <span className="text-ink-soft">{countOf(event.rsvp.notAttendingCards, 'card')}</span>
            </li>
            <li className="flex justify-between">
              <span>No reply yet</span>
              <span className="text-ink-soft">{countOf(event.rsvp.noReplyCards, 'card')}</span>
            </li>
          </ul>
        </Card>

        {event.groups.length > 0 && (
          <Card>
            <h2 className="font-semibold">By group</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {event.groups.map((group) => (
                <li key={group.groupName ?? 'none'} className="flex justify-between">
                  <span>{group.groupName ?? 'No group'}</span>
                  <span className="text-ink-soft">{countOf(group.cards, 'card')} · {countOf(group.seats, 'seat')}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

/** Who has come in at the door so far - refreshed every 10 seconds during the event. */
function ArrivalsCard({ eventId }: { eventId: string }) {
  const arrivals = useQuery({
    queryKey: ['arrivals', eventId],
    queryFn: () => api.get<ArrivalSummary>(`/api/events/${eventId}/check-in/summary`),
    refetchInterval: 10_000,
  })
  const numbers = arrivals.data
  if (!numbers) return null
  return (
    <Card>
      <h2 className="font-semibold">Arrivals</h2>
      <p className="mt-2 text-3xl font-semibold">{numbers.peopleArrived}</p>
      <p className="text-sm text-ink-soft">
        of {countOf(numbers.totalSeats, 'seat')} · {countOf(numbers.cardsArrived, 'card')} of {numbers.totalCards}
        {numbers.expectedFromRsvp > 0 && <> · {numbers.expectedFromRsvp} said they would come</>}
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {numbers.byCardType.map((row) => (
          <li key={row.cardTypeName} className="flex justify-between">
            <span>{row.cardTypeName}</span>
            <span className="text-ink-soft">{row.peopleArrived} of {row.seats}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
