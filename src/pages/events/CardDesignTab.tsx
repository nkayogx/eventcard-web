// Card design tab:
//   1. choose a style - your own artwork, or one of our templates
//   2. templates: edit the wording  /  own artwork: place the boxes
//   3. own artwork: optional special artwork per card type (e.g. gold VIP)
//   4. preview the real card for any card type

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { api } from '../../api/apiClient'
import {
  templateNames, type CardDesignDetails, type CardTemplate, type EventDetails, type FieldSettings,
} from '../../api/types'
import { AuthorizedImage } from '../../components/AuthorizedImage'
import { Button, Card, ErrorBox, SuccessBox } from '../../components/ui'
import { ArtworkEditor } from './ArtworkEditor'
import { CardPreviewDialog } from './CardPreviewDialog'
import { isReadOnly, useCanEditEvents } from './eventHelpers'

const templates: CardTemplate[] = ['CLASSIC', 'ELEGANT', 'MODERN']

/**
 * A short number that changes whenever the text changes. Added to the template picture
 * addresses, so the pictures are fetched again only when the wording changes.
 */
function shortFingerprint(text: string): number {
  let fingerprint = 0
  for (const letter of text) fingerprint = (fingerprint * 31 + letter.charCodeAt(0)) | 0
  return fingerprint
}

function uploadOf(file: File): FormData {
  const upload = new FormData()
  upload.append('file', file)
  return upload
}

export function CardDesignTab({ event }: { event: EventDetails }) {
  const canChange = useCanEditEvents() && !isReadOnly(event.status)
  const queryClient = useQueryClient()
  const designAddress = `/api/events/${event.id}/card-design`
  const artworkChooser = useRef<HTMLInputElement>(null)
  const [previewCardTypeId, setPreviewCardTypeId] = useState<string | null>(null)

  const design = useQuery({
    queryKey: ['card-design', event.id],
    queryFn: () => api.get<CardDesignDetails>(designAddress),
  })

  function showSavedDesign(saved: CardDesignDetails) {
    queryClient.setQueryData(['card-design', event.id], saved)
  }

  const save = useMutation({
    mutationFn: (changes: Partial<CardDesignDetails> & { fields?: FieldSettings[] }) =>
      api.put<CardDesignDetails>(designAddress, { ...changes, kind: changes.kind ?? design.data?.kind }),
    onSuccess: showSavedDesign,
  })

  const uploadArtwork = useMutation({
    mutationFn: (file: File) => api.post<CardDesignDetails>(`${designAddress}/background`, uploadOf(file)),
    onSuccess: showSavedDesign,
  })

  function chooseArtwork(changeEvent: ChangeEvent<HTMLInputElement>) {
    const file = changeEvent.target.files?.[0]
    changeEvent.target.value = ''
    if (file) uploadArtwork.mutate(file)
  }

  if (design.isLoading) return <p className="text-ink-soft">Loading…</p>
  if (design.error || !design.data) return <ErrorBox error={design.error} />
  const current = design.data

  function chooseOwnArtwork() {
    if (current.backgroundUrl) {
      save.mutate({ kind: 'UPLOADED' })
    } else {
      artworkChooser.current?.click()
    }
  }

  return (
    <div className="space-y-6">
      <input ref={artworkChooser} type="file" accept="image/png,image/jpeg" className="hidden" onChange={chooseArtwork} />

      {/* 1. Choose a style */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">Card style</h2>
          <p className="text-sm text-ink-soft">Upload your own finished design, or use one of our templates.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StyleChoice
            title="Your own design"
            chosen={current.kind === 'UPLOADED'}
            disabled={!canChange}
            onChoose={chooseOwnArtwork}
          >
            {current.backgroundUrl ? (
              <img src={current.backgroundUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center text-xs text-ink-soft">
                {uploadArtwork.isPending ? 'Uploading…' : 'Upload a PNG or JPG (max 5 MB)'}
              </div>
            )}
          </StyleChoice>
          {templates.map((template) => (
            <StyleChoice
              key={template}
              title={templateNames[template]}
              chosen={current.kind === 'TEMPLATE' && current.templateName === template}
              disabled={!canChange}
              onChoose={() => save.mutate({ kind: 'TEMPLATE', templateName: template })}
            >
              <AuthorizedImage
                path={`${designAddress}/preview.png?template=${template}&wording=${shortFingerprint(current.invitationText ?? '')}`}
                alt={`${templateNames[template]} template`}
                className="h-full w-full object-cover"
              />
            </StyleChoice>
          ))}
        </div>
        {uploadArtwork.error && <p className="text-sm text-danger">{(uploadArtwork.error as Error).message}</p>}
        <ErrorBox error={save.error} />
      </Card>

      {/* 2. Wording (templates) or box layout (own artwork) */}
      {current.kind === 'TEMPLATE' ? (
        <TemplateWording design={current} canChange={canChange} saving={save.isPending}
          onSave={(invitationText) => save.mutate({ invitationText })} />
      ) : (
        current.backgroundUrl && current.width && current.height && (
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Place the guest's details on your design</h2>
              {canChange && (
                <Button look="secondary" busy={uploadArtwork.isPending} onClick={() => artworkChooser.current?.click()}>
                  Replace artwork
                </Button>
              )}
            </div>
            <ArtworkEditor
              backgroundUrl={current.backgroundUrl}
              pictureWidth={current.width}
              pictureHeight={current.height}
              savedFields={current.fields}
              canChange={canChange}
              saving={save.isPending}
              saveError={save.error}
              onSave={(fields) => save.mutate({ kind: 'UPLOADED', fields })}
            />
          </Card>
        )
      )}

      {/* 3. Special artwork per card type */}
      {current.kind === 'UPLOADED' && (
        <CardTypeArtwork eventId={event.id} design={current} canChange={canChange} onSaved={showSavedDesign} />
      )}

      {/* 4. Preview */}
      <Card className="space-y-3">
        <h2 className="font-semibold">Preview the real card</h2>
        <p className="text-sm text-ink-soft">See exactly what guests will receive, with a sample name.</p>
        <div className="flex flex-wrap gap-2">
          {current.cardTypes.map((cardType) => (
            <Button key={cardType.id} look="secondary" onClick={() => setPreviewCardTypeId(cardType.id)}>
              Preview {cardType.name}
            </Button>
          ))}
        </div>
      </Card>

      {previewCardTypeId && (
        <CardPreviewDialog
          title="Card preview"
          imagePath={`${designAddress}/preview.png?cardTypeId=${previewCardTypeId}&version=${current.version}`}
          downloadName="card-preview.png"
          onClose={() => setPreviewCardTypeId(null)}
        />
      )}
    </div>
  )
}

function StyleChoice(props: {
  title: string
  chosen: boolean
  disabled: boolean
  onChoose: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onChoose}
      className={`overflow-hidden rounded-xl border-2 bg-white text-left transition disabled:cursor-default ${
        props.chosen ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-brand/40'
      }`}
    >
      <div className="aspect-[4/5] w-full bg-paper">{props.children}</div>
      <p className="flex items-center justify-between px-3 py-2 text-sm font-medium">
        {props.title}
        {props.chosen && <span className="text-xs text-brand">✓ Chosen</span>}
      </p>
    </button>
  )
}

function TemplateWording(props: {
  design: CardDesignDetails
  canChange: boolean
  saving: boolean
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(props.design.invitationText ?? '')
  useEffect(() => setText(props.design.invitationText ?? ''), [props.design.invitationText])

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Invitation wording</h2>
      <p className="text-sm text-ink-soft">
        Shown under the hosts' names. The card also shows the guest's name, event name, date, venue and QR code.
        Colours and logo come from your company profile.
      </p>
      <textarea
        rows={2} maxLength={300} value={text} disabled={!props.canChange}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
      />
      {props.canChange && (
        <Button busy={props.saving} disabled={text === props.design.invitationText} onClick={() => props.onSave(text)}>
          Save wording
        </Button>
      )}
    </Card>
  )
}

function CardTypeArtwork(props: {
  eventId: string
  design: CardDesignDetails
  canChange: boolean
  onSaved: (design: CardDesignDetails) => void
}) {
  const [chosenCardTypeId, setChosenCardTypeId] = useState<string | null>(null)
  const chooser = useRef<HTMLInputElement>(null)
  const address = (cardTypeId: string) => `/api/events/${props.eventId}/card-types/${cardTypeId}/background`

  const upload = useMutation({
    mutationFn: ({ cardTypeId, file }: { cardTypeId: string; file: File }) =>
      api.post<CardDesignDetails>(address(cardTypeId), uploadOf(file)),
    onSuccess: props.onSaved,
  })
  const remove = useMutation({
    mutationFn: (cardTypeId: string) => api.delete<CardDesignDetails>(address(cardTypeId)),
    onSuccess: props.onSaved,
  })

  function pickFor(cardTypeId: string) {
    setChosenCardTypeId(cardTypeId)
    chooser.current?.click()
  }

  function chooseFile(changeEvent: ChangeEvent<HTMLInputElement>) {
    const file = changeEvent.target.files?.[0]
    changeEvent.target.value = ''
    if (file && chosenCardTypeId) upload.mutate({ cardTypeId: chosenCardTypeId, file })
  }

  return (
    <Card className="space-y-4">
      <input ref={chooser} type="file" accept="image/png,image/jpeg" className="hidden" onChange={chooseFile} />
      <div>
        <h2 className="font-semibold">Different artwork per card type (optional)</h2>
        <p className="text-sm text-ink-soft">
          For example a gold card for VIP guests. It must be exactly {props.design.width} × {props.design.height} pixels,
          like your main artwork, so the name and QR code land in the same places.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {props.design.cardTypes.map((cardType) => (
          <li key={cardType.id} className="rounded-lg border border-line p-3">
            <img src={cardType.backgroundUrl ?? props.design.backgroundUrl ?? ''} alt=""
              className="mb-2 aspect-[4/5] w-full rounded object-cover" />
            <p className="text-sm font-medium">{cardType.name}</p>
            <p className="mb-2 text-xs text-ink-soft">{cardType.backgroundUrl ? 'Own artwork' : 'Uses main artwork'}</p>
            {props.canChange && (
              <div className="flex flex-wrap gap-2">
                <Button look="secondary" busy={upload.isPending && chosenCardTypeId === cardType.id}
                  onClick={() => pickFor(cardType.id)}>
                  Upload
                </Button>
                {cardType.backgroundUrl && (
                  <Button look="danger" busy={remove.isPending} onClick={() => remove.mutate(cardType.id)}>Remove</Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {upload.error && <p className="text-sm text-danger">{(upload.error as Error).message}</p>}
      {upload.isSuccess && <SuccessBox>Artwork saved.</SuccessBox>}
    </Card>
  )
}
