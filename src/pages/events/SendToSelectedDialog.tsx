// A pop-up for sending cards to the guests ticked in the guest list:
// choose WhatsApp / SMS, see what it costs, then send.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/apiClient'
import { sendChannelNames, type EventDetails, type SendBatch, type SendChannel, type SendPreview, type SendRequest } from '../../api/types'
import { Button, ErrorBox } from '../../components/ui'
import { countOf } from './eventHelpers'

interface Props {
  event: EventDetails
  guestIds: string[]
  onSent: () => void
  onClose: () => void
}

export function SendToSelectedDialog({ event, guestIds, onSent, onClose }: Props) {
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<SendChannel>('WHATSAPP_THEN_SMS')
  const request: SendRequest = { who: 'SELECTED', guestIds, channel }

  // What it would cost - nothing is sent yet
  const preview = useQuery({
    queryKey: ['send-preview', event.id, request],
    queryFn: () => api.post<SendPreview>(`/api/events/${event.id}/sending/preview`, request),
  })

  const send = useMutation({
    mutationFn: () => api.post<SendBatch>(`/api/events/${event.id}/sending`, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', event.id] })
      queryClient.invalidateQueries({ queryKey: ['sending', event.id] })
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      onSent()
    },
  })

  const result = preview.data
  const canSend = result && !result.cannotSendReason && result.guestCount > 0 && result.enoughCredits

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Send cards to selected guests"
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
        onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Send cards to {countOf(guestIds.length, 'selected guest')}</h2>
          <button onClick={onClose} className="text-sm text-ink-soft hover:text-ink">Close</button>
        </div>

        <fieldset className="space-y-1 text-sm">
          <legend className="mb-1 font-medium">Send by</legend>
          {(Object.keys(sendChannelNames) as SendChannel[]).map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input type="radio" name="selected-channel" checked={channel === option} onChange={() => setChannel(option)} />
              {sendChannelNames[option]}
            </label>
          ))}
        </fieldset>

        {result && (
          <div className="space-y-1 rounded-lg bg-paper p-4 text-sm">
            {result.cannotSendReason && <p className="text-danger">{result.cannotSendReason}.</p>}
            <p>
              <strong>{countOf(result.guestCount, 'card')}</strong> · up to <strong>{result.creditsNeeded}</strong> credits
              · you have {result.creditBalance}
            </p>
            {result.skippedCount > 0 && (
              <p className="text-ink-soft">
                {countOf(result.skippedCount, 'guest')} skipped: a message is already on its way to them.
              </p>
            )}
            {!result.enoughCredits && (
              <p className="text-danger">Not enough credits. <Link to="/billing" className="underline">Buy credits</Link></p>
            )}
          </div>
        )}

        <ErrorBox error={preview.error ?? send.error} />
        <div className="flex gap-2">
          <Button busy={send.isPending || preview.isLoading} disabled={!canSend} onClick={() => send.mutate()}>
            Send {result ? countOf(result.guestCount, 'card') : 'cards'}
          </Button>
          <Button look="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
