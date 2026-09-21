// Guests tab: the searchable guest list, adding/editing guests, and uploading a file.

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../api/apiClient'
import type { EventDetails, Guest, GuestPage } from '../../api/types'
import { Button, Card, ErrorBox } from '../../components/ui'
import { countOf, isReadOnly, useCanEditEvents } from './eventHelpers'
import { GuestPanel } from './GuestPanel'
import { ImportGuests } from './ImportGuests'

/** What is open on the right: nothing, the "add guest" form, one guest's form, or the upload. */
type SidePanel = { kind: 'none' } | { kind: 'add' } | { kind: 'edit'; guest: Guest } | { kind: 'import' }

export function GuestsTab({ event }: { event: EventDetails }) {
  const canChange = useCanEditEvents() && !isReadOnly(event.status)
  const [search, setSearch] = useState('')
  const [cardTypeId, setCardTypeId] = useState('')
  const [group, setGroup] = useState('')
  const [page, setPage] = useState(0)
  const [panel, setPanel] = useState<SidePanel>({ kind: 'none' })

  const guests = useQuery({
    queryKey: ['guests', event.id, search, cardTypeId, group, page],
    queryFn: () =>
      api.get<GuestPage>(
        `/api/events/${event.id}/guests?search=${encodeURIComponent(search)}&cardTypeId=${cardTypeId}` +
          `&group=${encodeURIComponent(group)}&page=${page}`,
      ),
  })

  function closePanel() {
    setPanel({ kind: 'none' })
  }

  // Changing a filter always goes back to the first page
  function filterBy(setter: (value: string) => void, value: string) {
    setter(value)
    setPage(0)
  }

  if (panel.kind === 'import') {
    return <ImportGuests event={event} onClose={closePanel} />
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="search" placeholder="Search name or phone…" value={search}
            onChange={(e) => filterBy(setSearch, e.target.value)}
            className="w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
          />
          <select aria-label="Card type" value={cardTypeId} onChange={(e) => filterBy(setCardTypeId, e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2">
            <option value="">All card types</option>
            {event.cardTypes.map((cardType) => (
              <option key={cardType.id} value={cardType.id}>{cardType.name}</option>
            ))}
          </select>
          {(guests.data?.groupNames.length ?? 0) > 0 && (
            <select aria-label="Group" value={group} onChange={(e) => filterBy(setGroup, e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2">
              <option value="">All groups</option>
              {guests.data?.groupNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          )}
        </div>

        {canChange && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPanel({ kind: 'add' })}>Add guest</Button>
            <Button look="secondary" onClick={() => setPanel({ kind: 'import' })}>Upload guest list</Button>
          </div>
        )}

        <ErrorBox error={guests.error} />
        <Card className="overflow-x-auto p-0">
          {guests.isLoading && <p className="p-6 text-ink-soft">Loading…</p>}
          {guests.data && guests.data.guests.length === 0 && (
            <p className="p-6 text-sm text-ink-soft">
              {search || cardTypeId || group ? 'No guests match your search.' : 'No guests yet.'}
            </p>
          )}
          {guests.data && guests.data.guests.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-medium">Name on card</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Card</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                </tr>
              </thead>
              <tbody>
                {guests.data.guests.map((guest) => (
                  <tr
                    key={guest.id}
                    onClick={() => canChange && setPanel({ kind: 'edit', guest })}
                    className={`border-b border-line last:border-0 ${canChange ? 'cursor-pointer hover:bg-paper' : ''} ${
                      panel.kind === 'edit' && panel.guest.id === guest.id ? 'bg-brand-soft' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{guest.nameOnCard}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{guest.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{guest.cardTypeName} ({guest.seats})</td>
                    <td className="px-4 py-3 text-ink-soft">{guest.groupName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {guests.data && guests.data.totalPages > 1 && (
          <div className="flex items-center gap-3 text-sm">
            <Button look="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-ink-soft">
              Page {page + 1} of {guests.data.totalPages} · {countOf(guests.data.totalGuests, 'guest')}
            </span>
            <Button look="secondary" disabled={page + 1 >= guests.data.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      <div>
        {panel.kind === 'add' && <GuestPanel event={event} onClose={closePanel} />}
        {panel.kind === 'edit' && (
          <GuestPanel key={panel.guest.id} event={event} guest={panel.guest} onClose={closePanel} />
        )}
      </div>
    </div>
  )
}
