// Small helpers shared by all the event screens.

import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/apiClient'
import { eventStatusNames, type EventDetails, type EventStatus } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'

/** Loads one event. Every event screen shares this, so a change on one tab shows on the others. */
export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.get<EventDetails>(`/api/events/${eventId}`),
    enabled: eventId !== undefined,
  })
}

/** Owners and managers may change events; check-in staff may only look. */
export function useCanEditEvents(): boolean {
  const { me } = useAuth()
  return me?.role === 'OWNER' || me?.role === 'MANAGER'
}

/** Finished and cancelled events can no longer be changed. */
export function isReadOnly(status: EventStatus): boolean {
  return status === 'FINISHED' || status === 'CANCELLED'
}

/** "Sat, 12 Dec 2026 · 4:00 PM" - shown exactly as the vendor typed it (the venue's local time). */
export function formatEventDate(localDateTime: string): string {
  const date = new Date(localDateTime)
  const day = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

const statusLooks: Record<EventStatus, string> = {
  DRAFT: 'bg-line text-ink',
  ACTIVE: 'bg-success-soft text-success',
  FINISHED: 'bg-brand-soft text-brand',
  CANCELLED: 'bg-danger-soft text-danger',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLooks[status]}`}>
      {eventStatusNames[status]}
    </span>
  )
}

/** "1 card", "2 cards" - the right word for the number. */
export function countOf(count: number, singular: string, plural = singular + 's'): string {
  return `${count} ${count === 1 ? singular : plural}`
}
