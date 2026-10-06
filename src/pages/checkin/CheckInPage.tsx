// The door screen, made for a phone: scan a guest's QR code (or search by name),
// see who it is and how many may enter, then let them in.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, api } from '../../api/apiClient'
import type { ArrivalGuest, ArrivalSummary, CheckInMethod, LookUpResult } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { ErrorBox } from '../../components/shared'
import { countOf, useEvent } from '../events/eventHelpers'
import { QrScanner } from './QrScanner'

/** A short beep and a buzz, so staff know a card was read without looking. */
function beepAndBuzz(good: boolean) {
  try {
    const sound = new AudioContext()
    const tone = sound.createOscillator()
    tone.frequency.value = good ? 880 : 220
    tone.connect(sound.destination)
    tone.start()
    tone.stop(sound.currentTime + 0.15)
  } catch {
    // no sound available - that's fine
  }
  navigator.vibrate?.(good ? 80 : [80, 60, 80])
}

function clockTime(moment: string | null): string {
  return moment ? new Date(moment).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
}

export function CheckInPage() {
  const { eventId } = useParams()
  const event = useEvent(eventId)
  const { me } = useAuth()
  const canUndo = me?.role === 'OWNER' || me?.role === 'MANAGER'
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'scan' | 'search'>('scan')
  const [result, setResult] = useState<LookUpResult | null>(null)
  const [method, setMethod] = useState<CheckInMethod>('QR_SCAN')
  const [typedCode, setTypedCode] = useState('')

  // Live numbers, refreshed every 5 seconds so several gates stay in step
  const summary = useQuery({
    queryKey: ['arrivals', eventId],
    queryFn: () => api.get<ArrivalSummary>(`/api/events/${eventId}/check-in/summary`),
    refetchInterval: 5000,
  })

  const lookUp = useMutation({
    mutationFn: (scanned: string) => api.post<LookUpResult>(`/api/events/${eventId}/check-in/look-up`, { scanned }),
    onSuccess: (found) => {
      setMethod('QR_SCAN')
      setResult(found)
      beepAndBuzz(found.status === 'READY' || found.status === 'PARTLY_ARRIVED')
    },
  })

  const letIn = useMutation({
    mutationFn: ({ guest, people }: { guest: ArrivalGuest; people: number }) =>
      api.post<ArrivalGuest>(`/api/events/${eventId}/check-in`, { guestId: guest.id, people, method }),
    onSuccess: () => {
      setResult(null) // ready for the next guest
      queryClient.invalidateQueries({ queryKey: ['arrivals', eventId] })
    },
  })

  const onScan = useCallback((text: string) => lookUp.mutate(text), [lookUp])

  function submitTypedCode(formEvent: FormEvent) {
    formEvent.preventDefault()
    if (typedCode.trim()) lookUp.mutate(typedCode)
    setTypedCode('')
  }

  function chooseFromSearch(guest: ArrivalGuest) {
    setMethod('MANUAL_SEARCH')
    setResult({ status: guest.seatsLeft === 0 ? 'ALL_ARRIVED' : guest.peopleArrived > 0 ? 'PARTLY_ARRIVED' : 'READY', guest })
  }

  const numbers = summary.data
  const percent = numbers && numbers.totalSeats > 0 ? Math.round((numbers.peopleArrived / numbers.totalSeats) * 100) : 0

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <Link to={`/events/${eventId}`} className="text-sm text-brand hover:underline">← Event</Link>
        <p className="truncate text-sm font-medium">{event.data?.name}</p>
      </div>

      {numbers && (
        <div className="rounded-2xl bg-card p-4 text-center shadow-sm ring-1 ring-line">
          <p className="text-3xl font-semibold">{numbers.peopleArrived} <span className="text-lg text-ink-soft">of {numbers.totalSeats}</span></p>
          <p className="text-sm text-ink-soft">people arrived · {countOf(numbers.cardsArrived, 'card')} of {numbers.totalCards}</p>
          <div className="mt-2 h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-success" style={{ width: `${percent}%` }} /></div>
        </div>
      )}
      <ErrorBox error={summary.error} />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-card p-1 ring-1 ring-line">
        {(['scan', 'search'] as const).map((option) => (
          <button key={option} onClick={() => { setMode(option); setResult(null) }}
            className={`rounded-lg py-2 text-sm font-medium ${mode === option ? 'bg-brand text-white' : 'text-ink-soft'}`}>
            {option === 'scan' ? 'Scan card' : 'Search by name'}
          </button>
        ))}
      </div>

      {result ? (
        <ResultCard result={result} busy={letIn.isPending}
          onLetIn={(people) => result.guest && letIn.mutate({ guest: result.guest, people })}
          onClose={() => setResult(null)} />
      ) : mode === 'scan' ? (
        <div className="space-y-3">
          <QrScanner onScan={onScan} paused={lookUp.isPending || result !== null} />
          {/* A barcode scanner "types" the code here and presses Enter */}
          <form onSubmit={submitTypedCode} className="flex gap-2">
            <input value={typedCode} onChange={(e) => setTypedCode(e.target.value)} placeholder="Or type / scan the code"
              aria-label="Card code" className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm" />
            <button className="rounded-lg bg-brand px-4 text-sm text-white">Find</button>
          </form>
        </div>
      ) : (
        <SearchPanel eventId={eventId!} onChoose={chooseFromSearch} />
      )}

      {lookUp.error && <NoConnectionOrError error={lookUp.error} />}
      {letIn.error && <NoConnectionOrError error={letIn.error} />}

      {numbers && numbers.recentCheckIns.length > 0 && (
        <RecentCheckIns eventId={eventId!} summary={numbers} canUndo={canUndo} />
      )}
    </div>
  )
}

/** Big, colour-coded answer: green = let in, yellow = some already inside, red = stop. */
function ResultCard(props: { result: LookUpResult; busy: boolean; onLetIn: (people: number) => void; onClose: () => void }) {
  const { status, guest } = props.result
  if (status === 'NOT_FOR_THIS_EVENT' || !guest) {
    return (
      <div className="space-y-3 rounded-2xl bg-danger p-6 text-center text-white">
        <p className="text-2xl font-semibold">Not for this event</p>
        <p className="text-sm">This card belongs to another event, or it is not a real card.</p>
        <button onClick={props.onClose} className="rounded-lg bg-white/20 px-4 py-2 text-sm">Scan next</button>
      </div>
    )
  }

  const colours = status === 'ALL_ARRIVED' ? 'bg-danger text-white' : status === 'PARTLY_ARRIVED' ? 'bg-warning-soft' : 'bg-success-soft'
  return (
    <div className={`space-y-3 rounded-2xl p-6 text-center ${colours}`}>
      <p className="text-2xl font-semibold">{guest.nameOnCard}</p>
      <p className="text-sm">{guest.cardTypeName} · {countOf(guest.seats, 'seat')}{guest.groupName ? ` · ${guest.groupName}` : ''}</p>
      {status === 'ALL_ARRIVED' ? (
        <p className="text-lg font-semibold">All {guest.seats} already arrived at {clockTime(guest.lastArrivedAt)}</p>
      ) : (
        <>
          {guest.peopleArrived > 0 && (
            <p className="font-medium">{guest.peopleArrived} of {guest.seats} already arrived at {clockTime(guest.lastArrivedAt)}</p>
          )}
          {guest.notes && <p className="text-sm italic">Note: {guest.notes}</p>}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {/* Biggest button first: usually everyone on the card arrives together */}
            {Array.from({ length: guest.seatsLeft }, (_, index) => guest.seatsLeft - index).map((people) => (
              <button key={people} disabled={props.busy} onClick={() => props.onLetIn(people)}
                className={`rounded-xl px-5 py-3 font-semibold ${people === guest.seatsLeft ? 'bg-success text-white' : 'bg-card ring-1 ring-line'}`}>
                Let {people} in
              </button>
            ))}
          </div>
        </>
      )}
      <button onClick={props.onClose} className="text-sm underline">{status === 'ALL_ARRIVED' ? 'Scan next' : 'Cancel'}</button>
    </div>
  )
}

function SearchPanel({ eventId, onChoose }: { eventId: string; onChoose: (guest: ArrivalGuest) => void }) {
  const [text, setText] = useState('')
  const found = useQuery({
    queryKey: ['check-in-search', eventId, text],
    queryFn: () => api.get<ArrivalGuest[]>(`/api/events/${eventId}/check-in/search?q=${encodeURIComponent(text)}`),
    enabled: text.trim().length >= 2,
  })
  return (
    <div className="space-y-2">
      <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Name or phone number"
        aria-label="Search guests" className="w-full rounded-lg border border-line bg-card px-3 py-3" />
      {found.data?.map((guest) => (
        <button key={guest.id} onClick={() => onChoose(guest)}
          className="flex w-full items-center justify-between rounded-lg bg-card p-3 text-left ring-1 ring-line hover:bg-paper">
          <span>
            <span className="block font-medium">{guest.nameOnCard}</span>
            <span className="text-xs text-ink-soft">{guest.cardTypeName} · {countOf(guest.seats, 'seat')}</span>
          </span>
          <span className={`text-sm ${guest.seatsLeft === 0 ? 'text-danger' : 'text-ink-soft'}`}>
            {guest.peopleArrived}/{guest.seats} in
          </span>
        </button>
      ))}
      {found.data && found.data.length === 0 && <p className="text-sm text-ink-soft">No guest found.</p>}
    </div>
  )
}

function RecentCheckIns({ eventId, summary, canUndo }: { eventId: string; summary: ArrivalSummary; canUndo: boolean }) {
  const queryClient = useQueryClient()
  const undo = useMutation({
    mutationFn: (checkInId: string) => api.post(`/api/events/${eventId}/check-ins/${checkInId}/undo`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['arrivals', eventId] }),
  })
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <p className="mb-2 text-sm font-medium">Just arrived</p>
      <ul className="space-y-1 text-sm">
        {summary.recentCheckIns.slice(0, 8).map((checkIn) => (
          <li key={checkIn.id} className={`flex items-center justify-between gap-2 ${checkIn.undone ? 'text-ink-soft line-through' : ''}`}>
            <span className="truncate">{clockTime(checkIn.createdAt)} · {checkIn.guestName} · {checkIn.people}</span>
            {canUndo && !checkIn.undone && (
              <button onClick={() => undo.mutate(checkIn.id)} className="text-xs text-brand hover:underline">Undo</button>
            )}
          </li>
        ))}
      </ul>
      {undo.error && <p className="mt-1 text-xs text-danger">{(undo.error as Error).message}</p>}
    </div>
  )
}

/** A dropped connection gets its own clear message; anything else shows the server's words. */
function NoConnectionOrError({ error }: { error: unknown }) {
  const noConnection = error instanceof ApiError && error.status === 0
  return (
    <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
      {noConnection ? 'No connection – check the internet and try again.' : (error as Error).message}
    </p>
  )
}
