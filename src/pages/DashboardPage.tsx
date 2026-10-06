// Dashboard: the home page for owners and managers.
// A quick look at upcoming events, guests, credits and how guests are answering the RSVP.

import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, CalendarHeartIcon, CoinsIcon, CrownIcon, PlusIcon, UsersIcon, type LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Cell, Pie, PieChart } from 'recharts'
import { api } from '@/api/apiClient'
import { eventTypeNames, type BillingOverview, type EventDetails, type EventPage, type EventSummary } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Button, Card, EmptyState, LoadingBlocks, PageTitle } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { countOf, EventStatusBadge } from './events/eventHelpers'

export function DashboardPage() {
  const { me } = useAuth()
  const navigate = useNavigate()

  const events = useQuery({ queryKey: ['events', 'dashboard'], queryFn: () => api.get<EventPage>('/api/events?page=0') })
  const billing = useQuery({ queryKey: ['billing'], queryFn: () => api.get<BillingOverview>('/api/billing') })

  // Upcoming = starts from today on, and not finished or cancelled
  const startOfToday = new Date(new Date().toDateString())
  const upcoming = (events.data?.events ?? []).filter(
    (event) => new Date(event.startsAt) >= startOfToday && (event.status === 'ACTIVE' || event.status === 'DRAFT'),
  )
  const nextEvent = upcoming[0]
  const upcomingCards = upcoming.reduce((total, event) => total + event.totalCards, 0)
  const upcomingSeats = upcoming.reduce((total, event) => total + event.totalSeats, 0)

  const firstName = me?.fullName.split(' ')[0] ?? ''

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageTitle
        title={`Karibu, ${firstName}`}
        subtitle="Here is how your events are going."
        actions={<Button onClick={() => navigate('/events/new')}><PlusIcon /> New event</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarHeartIcon} label="Upcoming events" value={upcoming.length} loading={events.isLoading} />
        <StatCard icon={UsersIcon} label="Guests invited" value={upcomingCards}
          note={`${countOf(upcomingSeats, 'seat')} in upcoming events`} loading={events.isLoading} />
        <StatCard icon={CoinsIcon} label="Message credits" value={billing.data?.creditBalance ?? 0}
          note={<Link to="/billing" className="text-primary hover:underline">Buy credits</Link>} loading={billing.isLoading} />
        <StatCard icon={CrownIcon} label="Plan" value={billing.data?.plan.name ?? '—'} gold
          note={billing.data?.paidUntil ? `Paid until ${new Date(billing.data.paidUntil).toLocaleDateString()}` : 'Upgrade any time'}
          loading={billing.isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="font-heading text-lg font-semibold">Upcoming events</h2>
            <Link to="/events" className="flex items-center gap-1 text-sm text-primary hover:underline">
              All events <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          {events.isLoading && <div className="p-6"><LoadingBlocks rows={3} /></div>}
          {events.data && upcoming.length === 0 && (
            <div className="p-6">
              <EmptyState icon={<CalendarHeartIcon />} title="No upcoming events"
                text="Create an event to start building its guest list and cards."
                action={<Button onClick={() => navigate('/events/new')}><PlusIcon /> New event</Button>} />
            </div>
          )}
          <ul className="divide-y">
            {upcoming.slice(0, 6).map((event) => <UpcomingEventRow key={event.id} event={event} />)}
          </ul>
        </Card>

        {nextEvent ? <RsvpCard eventId={nextEvent.id} /> : <Card><p className="text-sm text-muted-foreground">RSVP answers will show here once you have an upcoming event.</p></Card>}
      </div>
    </div>
  )
}

function StatCard(props: { icon: LucideIcon; label: string; value: number | string; note?: React.ReactNode; loading: boolean; gold?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{props.label}</p>
        <span className={`flex size-9 items-center justify-center rounded-full ${props.gold ? 'bg-gold/15 text-gold' : 'bg-secondary text-primary'}`}>
          <props.icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 font-heading text-3xl font-semibold">
        {props.loading ? '…' : typeof props.value === 'number' ? props.value.toLocaleString('en-US') : props.value}
      </p>
      {props.note && <p className="mt-1 text-xs text-muted-foreground">{props.note}</p>}
    </Card>
  )
}

/** One upcoming event: a calendar-style date, the name, and its guest numbers. */
function UpcomingEventRow({ event }: { event: EventSummary }) {
  const date = new Date(event.startsAt)
  return (
    <li>
      <Link to={`/events/${event.id}`} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/60">
        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg border bg-secondary/60 py-1">
          <span className="text-[10px] font-semibold uppercase text-primary">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
          <span className="font-heading text-xl font-semibold leading-none">{date.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{event.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {eventTypeNames[event.eventType]} · {event.venueName}
          </p>
        </div>
        <div className="hidden text-right text-sm sm:block">
          <p>{countOf(event.totalCards, 'card')}</p>
          <p className="text-muted-foreground">{countOf(event.totalSeats, 'seat')}</p>
        </div>
        <EventStatusBadge status={event.status} />
      </Link>
    </li>
  )
}

const rsvpChart = {
  attending: { label: 'Attending', color: 'var(--chart-1)' },
  notAttending: { label: 'Not attending', color: 'var(--chart-3)' },
  noReply: { label: 'No reply yet', color: 'var(--chart-2)' },
} satisfies ChartConfig

/** A ring chart of RSVP answers for the next event. */
function RsvpCard({ eventId }: { eventId: string }) {
  const event = useQuery({ queryKey: ['event', eventId], queryFn: () => api.get<EventDetails>(`/api/events/${eventId}`) })
  if (!event.data) return <Card><LoadingBlocks rows={2} /></Card>

  const rsvp = event.data.rsvp
  const slices = [
    { key: 'attending', value: rsvp.attendingCards },
    { key: 'notAttending', value: rsvp.notAttendingCards },
    { key: 'noReply', value: rsvp.noReplyCards },
  ] as const
  const answered = rsvp.attendingCards + rsvp.notAttendingCards
  const total = answered + rsvp.noReplyCards

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">RSVP · next event</h2>
          <p className="truncate text-sm text-muted-foreground">{event.data.name}</p>
        </div>
        <Badge variant="outline" className="border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold">
          {total > 0 ? Math.round((answered / total) * 100) : 0}% answered
        </Badge>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No guests yet.</p>
      ) : (
        <ChartContainer config={rsvpChart} className="mx-auto mt-2 aspect-square h-52">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
            <Pie data={[...slices]} dataKey="value" nameKey="key" innerRadius={58} strokeWidth={4}>
              {slices.map((slice) => <Cell key={slice.key} fill={`var(--color-${slice.key})`} />)}
            </Pie>
          </PieChart>
        </ChartContainer>
      )}

      <ul className="mt-auto space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: rsvpChart[slice.key].color }} />
              {rsvpChart[slice.key].label}
            </span>
            <span className="text-muted-foreground">{countOf(slice.value, 'card')}</span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t pt-2 font-medium">
          <span>People coming</span>
          <span>{rsvp.attendingPeople}</span>
        </li>
      </ul>
    </Card>
  )
}
