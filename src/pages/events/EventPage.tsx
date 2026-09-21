// One event, with tabs: Overview, Guests, Card types and Card design.

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { eventTypeNames } from '../../api/types'
import { ErrorBox } from '../../components/ui'
import { CardTypesTab } from './CardTypesTab'
import { EventStatusBadge, formatEventDate, useEvent } from './eventHelpers'
import { GuestsTab } from './GuestsTab'
import { OverviewTab } from './OverviewTab'

const tabs = ['Overview', 'Guests', 'Card types', 'Card design'] as const
type Tab = (typeof tabs)[number]

export function EventPage() {
  const { eventId } = useParams()
  const event = useEvent(eventId)
  const [openTab, setOpenTab] = useState<Tab>('Overview')

  if (event.isLoading) return <p className="text-ink-soft">Loading…</p>
  if (event.error || !event.data) return <ErrorBox error={event.error} />

  const details = event.data
  return (
    <div className="max-w-5xl">
      <Link to="/events" className="text-sm text-brand hover:underline">← All events</Link>

      <div className="mt-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{details.name}</h1>
          <EventStatusBadge status={details.status} />
        </div>
        <p className="mt-1 text-ink-soft">
          {eventTypeNames[details.eventType]} · {formatEventDate(details.startsAt)} · {details.venueName}
        </p>
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setOpenTab(tab)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm ${
              openTab === tab ? 'border-brand font-medium text-brand' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {tab}
            {tab === 'Guests' && <span className="ml-1.5 text-xs text-ink-soft">{details.totalCards}</span>}
          </button>
        ))}
      </nav>

      {openTab === 'Overview' && <OverviewTab event={details} />}
      {openTab === 'Guests' && <GuestsTab event={details} />}
      {openTab === 'Card types' && <CardTypesTab event={details} />}
      {openTab === 'Card design' && (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-medium">Card design is coming in the next part</p>
          <p className="mt-1 text-sm text-ink-soft">
            You'll design the invitation card here, using your brand colours and logo.
          </p>
        </div>
      )}
    </div>
  )
}
