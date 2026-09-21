// The page a GUEST sees when they open their personal link (e.g. /i/Xk9p2QmT7aBc).
// No login. Shows their card, the event details, a map button, "Add to calendar", and RSVP.
// Styled in the inviting company's colours.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, api } from '../../api/apiClient'
import type { InvitationPage as Invitation } from '../../api/types'
import { formatEventDate } from '../events/eventHelpers'
import { downloadCalendarFile } from './calendarFile'

export function InvitationPage() {
  const { code } = useParams()
  const invitation = useQuery({
    queryKey: ['invitation', code],
    queryFn: () => api.get<Invitation>(`/api/public/invitations/${code}`),
    retry: false,
  })

  if (invitation.isLoading) {
    return <p className="p-8 text-center text-ink-soft">Opening your invitation…</p>
  }
  if (invitation.error || !invitation.data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">This invitation is not available</p>
          <p className="mt-2 text-sm text-ink-soft">
            {(invitation.error as Error)?.message ?? 'Please check the link, or contact the hosts.'}
          </p>
        </div>
      </main>
    )
  }
  return <InvitationDetails code={code!} invitation={invitation.data} />
}

function InvitationDetails({ code, invitation }: { code: string; invitation: Invitation }) {
  const mainColour = invitation.company.primaryColor ?? '#7A1F3D'
  const softColour = invitation.company.secondaryColor ?? '#F7E9EE'
  const event = invitation.event

  return (
    <main className="min-h-screen pb-12" style={{ backgroundColor: softColour }}>
      <div className="mx-auto max-w-lg px-4 pt-6">
        <img
          src={API_URL + invitation.cardImagePath}
          alt={`Invitation card for ${invitation.guestName}`}
          className="w-full rounded-2xl shadow-lg"
        />

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: mainColour }}>
            Dear {invitation.guestName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{event.name}</h1>
          {event.hostNames && <p className="mt-1 text-ink-soft">Hosted by {event.hostNames}</p>}

          <dl className="mt-5 space-y-3 text-sm">
            <Detail label="When" value={formatEventDate(event.startsAt)} />
            <Detail label="Where" value={[event.venueName, event.venueAddress].filter(Boolean).join(', ')} />
            <Detail label="Your card" value={`${invitation.cardTypeName} · admits ${invitation.seats}`} />
            {event.dressCode && <Detail label="Dress code" value={event.dressCode} />}
            {event.contactPhone && (
              <Detail label="Questions" value={<a href={`tel:${event.contactPhone}`} className="underline">{event.contactPhone}</a>} />
            )}
          </dl>
          {event.extraInfo && <p className="mt-4 whitespace-pre-line text-sm">{event.extraInfo}</p>}

          <div className="mt-6 grid grid-cols-2 gap-3">
            {event.mapLink && (
              <a href={event.mapLink} target="_blank" rel="noreferrer"
                className="rounded-lg px-4 py-2.5 text-center text-sm font-medium text-white" style={{ backgroundColor: mainColour }}>
                Open map
              </a>
            )}
            <button onClick={() => downloadCalendarFile(code, invitation)}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium" style={{ borderColor: mainColour, color: mainColour }}>
              Add to calendar
            </button>
          </div>
        </section>

        <RsvpForm code={code} invitation={invitation} mainColour={mainColour} />

        <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-soft">
          {invitation.company.logoUrl && <img src={invitation.company.logoUrl} alt="" className="h-6 object-contain" />}
          <span>Invitation by {invitation.company.name}</span>
        </footer>
      </div>
    </main>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function RsvpForm({ code, invitation, mainColour }: { code: string; invitation: Invitation; mainColour: string }) {
  const queryClient = useQueryClient()
  const alreadyAnswered = invitation.rsvpStatus !== 'NO_REPLY'
  const [changing, setChanging] = useState(!alreadyAnswered)
  const [attending, setAttending] = useState<boolean | null>(
    alreadyAnswered ? invitation.rsvpStatus === 'ATTENDING' : null,
  )
  const [people, setPeople] = useState(invitation.rsvpPeople ?? invitation.seats)
  const [message, setMessage] = useState(invitation.rsvpMessage ?? '')

  const send = useMutation({
    mutationFn: () =>
      api.post<Invitation>(`/api/public/invitations/${code}/rsvp`, { attending, people, message: message || null }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['invitation', code], updated)
      setChanging(false)
    },
  })

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault()
    send.mutate()
  }

  const answerText = invitation.rsvpStatus === 'ATTENDING'
    ? `You're coming${invitation.rsvpPeople && invitation.rsvpPeople > 1 ? ` (${invitation.rsvpPeople} people)` : ''}. See you there!`
    : "You've let the hosts know you can't make it."

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Will you attend?</h2>
      {invitation.rsvpDeadline && (
        <p className="text-sm text-ink-soft">Please reply by {new Date(invitation.rsvpDeadline).toLocaleDateString()}.</p>
      )}

      {!invitation.rsvpOpen && (
        <p className="mt-3 text-sm">
          {alreadyAnswered ? answerText + ' ' : ''}The RSVP deadline has passed.
        </p>
      )}

      {invitation.rsvpOpen && !changing && (
        <div className="mt-3 space-y-3">
          <p className="text-sm">{send.isSuccess ? 'Thank you! ' : ''}{answerText}</p>
          <button onClick={() => setChanging(true)} className="text-sm underline" style={{ color: mainColour }}>
            Change my answer
          </button>
        </div>
      )}

      {invitation.rsvpOpen && changing && (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((choice) => (
              <button
                key={String(choice)}
                type="button"
                onClick={() => setAttending(choice)}
                className="rounded-lg border-2 px-4 py-3 text-sm font-medium"
                style={attending === choice
                  ? { borderColor: mainColour, backgroundColor: mainColour, color: 'white' }
                  : { borderColor: '#e8e2e4' }}
              >
                {choice ? 'Yes, I will attend' : "Sorry, I can't"}
              </button>
            ))}
          </div>

          {attending && invitation.seats > 1 && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">How many of you are coming?</span>
              <select value={people} onChange={(e) => setPeople(Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-white px-3 py-2">
                {Array.from({ length: invitation.seats }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
          )}

          {attending !== null && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Message to the hosts (optional)</span>
              <textarea rows={2} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2" placeholder="Hongera! Congratulations!" />
            </label>
          )}

          {send.error && <p className="text-sm text-danger">{(send.error as Error).message}</p>}
          <button type="submit" disabled={attending === null || send.isPending}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: mainColour }}>
            {send.isPending ? 'Sending…' : 'Send my answer'}
          </button>
        </form>
      )}
    </section>
  )
}
