// The list of the company's events.

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/apiClient'
import { eventStatusNames, eventTypeNames, type EventPage, type EventStatus } from '../../api/types'
import { Button, ErrorBox, PageTitle } from '../../components/ui'
import { countOf, EventStatusBadge, formatEventDate, useCanEditEvents } from './eventHelpers'

const statusFilters: (EventStatus | '')[] = ['', 'DRAFT', 'ACTIVE', 'FINISHED', 'CANCELLED']

export function EventsPage() {
  const canEdit = useCanEditEvents()
  const navigate = useNavigate()
  const [status, setStatus] = useState<EventStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const events = useQuery({
    queryKey: ['events', status, search, page],
    queryFn: () =>
      api.get<EventPage>(`/api/events?status=${status}&search=${encodeURIComponent(search)}&page=${page}`),
  })

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle title="Events" subtitle="Your weddings, send-offs and other celebrations." />
        {canEdit && (
          <Button onClick={() => navigate('/events/new')}>New event</Button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name or venue…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
        />
        <div className="flex flex-wrap gap-1">
          {statusFilters.map((option) => (
            <button
              key={option || 'all'}
              onClick={() => {
                setStatus(option)
                setPage(0)
              }}
              className={`rounded-full px-3 py-1.5 text-sm ${
                status === option ? 'bg-brand text-white' : 'bg-white text-ink-soft ring-1 ring-line hover:bg-paper'
              }`}
            >
              {option === '' ? 'All' : eventStatusNames[option]}
            </button>
          ))}
        </div>
      </div>

      <ErrorBox error={events.error} />
      {events.isLoading && <p className="text-ink-soft">Loading…</p>}

      {events.data && events.data.events.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-medium">No events yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            {canEdit ? 'Create your first event to start building its guest list.' : 'Nothing to show here.'}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {events.data?.events.map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="rounded-xl border border-line bg-white p-5 transition hover:border-brand/40 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{eventTypeNames[event.eventType]}</p>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="mt-2 text-lg font-semibold">{event.name}</p>
            <p className="mt-1 text-sm text-ink-soft">{formatEventDate(event.startsAt)}</p>
            <p className="text-sm text-ink-soft">{event.venueName}</p>
            <p className="mt-3 text-sm">
              {countOf(event.totalCards, 'card')} · {countOf(event.totalSeats, 'seat')}
            </p>
          </Link>
        ))}
      </div>

      {events.data && events.data.totalPages > 1 && (
        <div className="mt-6 flex items-center gap-3 text-sm">
          <Button look="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-ink-soft">Page {page + 1} of {events.data.totalPages}</span>
          <Button look="secondary" disabled={page + 1 >= events.data.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
