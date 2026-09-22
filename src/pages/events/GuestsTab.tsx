// Guests tab: the searchable guest list, adding/editing guests, and uploading a file.

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../api/apiClient'
import { messageStatusNames, rsvpNames, type EventDetails, type Guest, type GuestPage, type MessageStatus, type RsvpStatus } from '../../api/types'
import { Button, Card, ErrorBox } from '../../components/ui'
import { CardPreviewDialog } from './CardPreviewDialog'
import { countOf, isReadOnly, useCanEditEvents } from './eventHelpers'
import { GuestPanel } from './GuestPanel'
import { ImportGuests } from './ImportGuests'
import { SendToSelectedDialog } from './SendToSelectedDialog'

/** What is open on the right: nothing, the "add guest" form, one guest's form, or the upload. */
type SidePanel = { kind: 'none' } | { kind: 'add' } | { kind: 'edit'; guest: Guest } | { kind: 'import' }

export function GuestsTab({ event }: { event: EventDetails }) {
  const canEditEvents = useCanEditEvents()
  const canChange = canEditEvents && !isReadOnly(event.status)
  // Owners and managers can tick guests and send them their cards
  const canSelect = canEditEvents && event.status === 'ACTIVE'
  const [search, setSearch] = useState('')
  const [cardTypeId, setCardTypeId] = useState('')
  const [group, setGroup] = useState('')
  const [rsvp, setRsvp] = useState('')
  const [page, setPage] = useState(0)
  const [panel, setPanel] = useState<SidePanel>({ kind: 'none' })
  const [cardToShow, setCardToShow] = useState<Guest | null>(null)
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null)
  // Ticked guests are remembered while you move between pages and filters
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sendingToSelected, setSendingToSelected] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

  const guests = useQuery({
    queryKey: ['guests', event.id, search, cardTypeId, group, rsvp, page],
    queryFn: () =>
      api.get<GuestPage>(
        `/api/events/${event.id}/guests?search=${encodeURIComponent(search)}&cardTypeId=${cardTypeId}` +
          `&group=${encodeURIComponent(group)}&rsvp=${rsvp}&page=${page}`,
      ),
  })

  function closePanel() {
    setPanel({ kind: 'none' })
  }

  async function copyLink(guest: Guest) {
    await navigator.clipboard.writeText(guest.invitationLink)
    setCopiedGuestId(guest.id)
  }

  function toggleGuest(guestId: string) {
    const updated = new Set(selectedIds)
    if (updated.has(guestId)) {
      updated.delete(guestId)
    } else {
      updated.add(guestId)
    }
    setSelectedIds(updated)
    setSentMessage(null)
  }

  /** The box in the heading ticks (or unticks) every guest on this page. */
  function toggleWholePage(pageGuests: Guest[]) {
    const everyoneTicked = pageGuests.every((guest) => selectedIds.has(guest.id))
    const updated = new Set(selectedIds)
    pageGuests.forEach((guest) => (everyoneTicked ? updated.delete(guest.id) : updated.add(guest.id)))
    setSelectedIds(updated)
    setSentMessage(null)
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
          <select aria-label="RSVP" value={rsvp} onChange={(e) => filterBy(setRsvp, e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2">
            <option value="">All RSVP answers</option>
            {(Object.keys(rsvpNames) as RsvpStatus[]).map((status) => (
              <option key={status} value={status}>{rsvpNames[status]}</option>
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

        {canSelect && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-soft px-4 py-3 text-sm">
            <strong>{countOf(selectedIds.size, 'guest')} selected</strong>
            <Button onClick={() => setSendingToSelected(true)}>Send cards to selected</Button>
            <button onClick={() => setSelectedIds(new Set())} className="text-brand hover:underline">Clear selection</button>
          </div>
        )}
        {sentMessage && <p className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">{sentMessage}</p>}

        <ErrorBox error={guests.error} />
        <Card className="overflow-x-auto p-0">
          {guests.isLoading && <p className="p-6 text-ink-soft">Loading…</p>}
          {guests.data && guests.data.guests.length === 0 && (
            <p className="p-6 text-sm text-ink-soft">
              {search || cardTypeId || group || rsvp ? 'No guests match your search.' : 'No guests yet.'}
            </p>
          )}
          {guests.data && guests.data.guests.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  {canSelect && (
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" aria-label="Select all guests on this page"
                        checked={guests.data.guests.every((guest) => selectedIds.has(guest.id))}
                        onChange={() => toggleWholePage(guests.data.guests)} />
                    </th>
                  )}
                  <th className="px-4 py-3 font-medium">Name on card</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Card type</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Card sent</th>
                  <th className="px-4 py-3 font-medium">RSVP</th>
                  <th className="px-4 py-3 font-medium">Invitation</th>
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
                    {canSelect && (
                      <td className="px-4 py-3" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${guest.nameOnCard}`}
                          checked={selectedIds.has(guest.id)} onChange={() => toggleGuest(guest.id)} />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{guest.nameOnCard}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{guest.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{guest.cardTypeName} ({guest.seats})</td>
                    <td className="px-4 py-3 text-ink-soft">{guest.groupName ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><CardStatus status={guest.cardStatus} /></td>
                    <td className="px-4 py-3 whitespace-nowrap" title={guest.rsvpMessage ?? undefined}>
                      <RsvpBadge guest={guest} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                      <button onClick={() => setCardToShow(guest)} className="mr-3 text-brand hover:underline">View card</button>
                      <button onClick={() => copyLink(guest)} className="text-brand hover:underline">
                        {copiedGuestId === guest.id ? 'Copied ✓' : 'Copy link'}
                      </button>
                    </td>
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

      {sendingToSelected && (
        <SendToSelectedDialog
          event={event}
          guestIds={[...selectedIds]}
          onClose={() => setSendingToSelected(false)}
          onSent={() => {
            setSentMessage(`Cards for ${countOf(selectedIds.size, 'guest')} are being sent. Follow the progress in the "Send cards" tab.`)
            setSelectedIds(new Set())
            setSendingToSelected(false)
          }}
        />
      )}

      {cardToShow && (
        <CardPreviewDialog
          title={`Card for ${cardToShow.nameOnCard}`}
          imagePath={`/api/events/${event.id}/guests/${cardToShow.id}/card.png`}
          downloadName={`card-${cardToShow.nameOnCard.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`}
          onClose={() => setCardToShow(null)}
        />
      )}

      <div>
        {panel.kind === 'add' && <GuestPanel event={event} onClose={closePanel} />}
        {panel.kind === 'edit' && (
          <GuestPanel key={panel.guest.id} event={event} guest={panel.guest} onClose={closePanel} />
        )}
      </div>
    </div>
  )
}

function RsvpBadge({ guest }: { guest: Guest }) {
  const looks: Record<RsvpStatus, string> = {
    ATTENDING: 'bg-success-soft text-success',
    NOT_ATTENDING: 'bg-danger-soft text-danger',
    NO_REPLY: 'bg-line text-ink-soft',
  }
  const peopleNote = guest.rsvpStatus === 'ATTENDING' && guest.rsvpPeople ? ` (${guest.rsvpPeople})` : ''
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${looks[guest.rsvpStatus]}`}>
      {rsvpNames[guest.rsvpStatus]}{peopleNote}
    </span>
  )
}

/** 🕓 waiting · ✓ sent · ✓✓ delivered · 👁 read · ⚠ failed - or "Not sent". */
function CardStatus({ status }: { status: MessageStatus | null }) {
  if (!status) return <span className="text-ink-soft">Not sent</span>
  const symbols: Record<MessageStatus, string> = {
    QUEUED: '🕓', SENDING: '🕓', SENT: '✓', DELIVERED: '✓✓', READ: '👁', FAILED: '⚠',
  }
  const look = status === 'FAILED' ? 'text-danger' : status === 'DELIVERED' || status === 'READ' ? 'text-success' : ''
  return <span className={look} title={messageStatusNames[status]}>{symbols[status]} {messageStatusNames[status]}</span>
}
