// The editor for uploaded artwork: the vendor's picture with three boxes on top
// (Guest name, Card type, QR code). Drag a box to move it; drag its corner to resize it.
// The side panel changes the selected box's font, size, colour and alignment.
//
// Positions are kept in PERCENT of the picture, exactly like the server stores them.

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { fieldNames, fontNames, type CardField, type CardFont, type FieldSettings, type TextAlign } from '../../api/types'
import { Button, ErrorBox } from '../../components/shared'

/** How each card font looks in the browser (the server uses the same fonts). */
const cssFonts: Record<CardFont, { family: string; weight: number }> = {
  PLAYFAIR: { family: '"Playfair Display", serif', weight: 400 },
  PLAYFAIR_BOLD: { family: '"Playfair Display", serif', weight: 700 },
  MONTSERRAT: { family: 'Montserrat, sans-serif', weight: 400 },
  MONTSERRAT_BOLD: { family: 'Montserrat, sans-serif', weight: 700 },
  GREAT_VIBES: { family: '"Great Vibes", cursive', weight: 400 },
}

const sampleText: Record<CardField, string> = {
  GUEST_NAME: 'Mr & Mrs Sample',
  CARD_TYPE: 'DOUBLE',
  QR_CODE: '',
}

interface Props {
  backgroundUrl: string
  pictureWidth: number
  pictureHeight: number
  savedFields: FieldSettings[]
  canChange: boolean
  saving: boolean
  saveError: unknown
  onSave: (fields: FieldSettings[]) => void
}

/** What the pointer is doing right now: nothing, moving a box, or resizing a box. */
type Dragging = { mode: 'move' | 'resize'; field: CardField; startX: number; startY: number; startBox: FieldSettings } | null

const keepBetween = (value: number, lowest: number, highest: number) => Math.min(highest, Math.max(lowest, value))

export function ArtworkEditor(props: Props) {
  const [fields, setFields] = useState<FieldSettings[]>(props.savedFields)
  const [selected, setSelected] = useState<CardField>('GUEST_NAME')
  const [dragging, setDragging] = useState<Dragging>(null)
  const [shownWidth, setShownWidth] = useState(0) // width of the picture on screen, in pixels
  const pictureArea = useRef<HTMLDivElement>(null)

  // When the saved design changes (e.g. new artwork uploaded), start again from it
  useEffect(() => setFields(props.savedFields), [props.savedFields])

  // Remember how wide the picture is on screen, so text is shown at the right size
  useEffect(() => {
    const area = pictureArea.current
    if (!area) return
    const watcher = new ResizeObserver(() => setShownWidth(area.clientWidth))
    watcher.observe(area)
    return () => watcher.disconnect()
  }, [])

  const screenPixelsPerPicturePixel = shownWidth / props.pictureWidth
  const selectedBox = fields.find((box) => box.field === selected)
  const hasUnsavedChanges = JSON.stringify(fields) !== JSON.stringify(props.savedFields)

  function changeBox(field: CardField, changes: Partial<FieldSettings>) {
    setFields((current) => current.map((box) => (box.field === field ? { ...box, ...changes } : box)))
  }

  function startDragging(pointer: PointerEvent, box: FieldSettings, mode: 'move' | 'resize') {
    if (!props.canChange) return
    pointer.stopPropagation()
    pointer.currentTarget.setPointerCapture(pointer.pointerId)
    setSelected(box.field)
    setDragging({ mode, field: box.field, startX: pointer.clientX, startY: pointer.clientY, startBox: box })
  }

  function keepDragging(pointer: PointerEvent) {
    const area = pictureArea.current
    if (!dragging || !area) return
    // How far the pointer moved, in percent of the picture
    const movedRight = ((pointer.clientX - dragging.startX) / area.clientWidth) * 100
    const movedDown = ((pointer.clientY - dragging.startY) / area.clientHeight) * 100
    const box = dragging.startBox

    if (dragging.mode === 'move') {
      changeBox(dragging.field, {
        x: keepBetween(box.x + movedRight, 0, 100 - box.width),
        y: keepBetween(box.y + movedDown, 0, 100 - box.height),
      })
    } else {
      changeBox(dragging.field, {
        width: keepBetween(box.width + movedRight, 3, 100 - box.x),
        height: keepBetween(box.height + movedDown, 2, 100 - box.y),
      })
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        <div
          ref={pictureArea}
          className="relative w-full touch-none select-none overflow-hidden rounded-lg border border-line"
          style={{ aspectRatio: `${props.pictureWidth} / ${props.pictureHeight}` }}
          onPointerMove={keepDragging}
          onPointerUp={() => setDragging(null)}
        >
          <img src={props.backgroundUrl} alt="Your card artwork" className="absolute inset-0 h-full w-full" draggable={false} />

          {fields.map((box) => (
            <div
              key={box.field}
              onPointerDown={(pointer) => startDragging(pointer, box, 'move')}
              className={`absolute flex items-center border-2 ${props.canChange ? 'cursor-move' : ''} ${
                selected === box.field ? 'border-brand bg-brand/10' : 'border-dashed border-ink/40'
              } ${box.visible ? '' : 'opacity-40'}`}
              style={{
                left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%`,
                justifyContent: box.align === 'LEFT' ? 'flex-start' : box.align === 'RIGHT' ? 'flex-end' : 'center',
              }}
            >
              {box.field === 'QR_CODE' ? (
                <div className="flex aspect-square h-full max-w-full items-center justify-center bg-card text-[10px] font-medium text-ink">
                  QR
                </div>
              ) : (
                <span
                  className="overflow-hidden whitespace-nowrap"
                  style={{
                    fontFamily: cssFonts[box.font].family,
                    fontWeight: cssFonts[box.font].weight,
                    fontSize: `${box.fontSize * screenPixelsPerPicturePixel}px`,
                    color: box.color,
                  }}
                >
                  {sampleText[box.field]}
                </span>
              )}
              <span className="absolute -top-5 left-0 rounded bg-ink/70 px-1 text-[10px] text-white">
                {fieldNames[box.field]}
              </span>
              {props.canChange && (
                <span
                  aria-label={`Resize ${fieldNames[box.field]}`}
                  onPointerDown={(pointer) => startDragging(pointer, box, 'resize')}
                  className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize rounded-sm bg-brand"
                />
              )}
            </div>
          ))}
        </div>
        {props.canChange && (
          <p className="mt-2 text-xs text-ink-soft">
            Drag a box to move it. Drag its small corner square to resize it. The real card uses the guest's own name.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {fields.map((box) => (
            <button
              key={box.field}
              onClick={() => setSelected(box.field)}
              className={`rounded-full px-3 py-1 text-sm ${
                selected === box.field ? 'bg-brand text-white' : 'bg-card text-ink-soft ring-1 ring-line'
              }`}
            >
              {fieldNames[box.field]}
            </button>
          ))}
        </div>

        {selectedBox && (
          <fieldset disabled={!props.canChange} className="space-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={selectedBox.visible}
                onChange={(e) => changeBox(selectedBox.field, { visible: e.target.checked })} />
              Show on the card
            </label>

            {selectedBox.field !== 'QR_CODE' && (
              <>
                <label className="block">
                  <span className="mb-1 block font-medium">Font</span>
                  <select value={selectedBox.font}
                    onChange={(e) => changeBox(selectedBox.field, { font: e.target.value as CardFont })}
                    className="w-full rounded-lg border border-line bg-card px-2 py-1.5">
                    {Object.entries(fontNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-medium">Text size</span>
                  <input type="range" min={8} max={Math.max(40, Math.round(props.pictureHeight / 6))}
                    value={selectedBox.fontSize} className="w-full"
                    onChange={(e) => changeBox(selectedBox.field, { fontSize: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-2">
                  <input type="color" value={selectedBox.color} className="h-8 w-10 rounded border border-line"
                    onChange={(e) => changeBox(selectedBox.field, { color: e.target.value.toUpperCase() })} />
                  <span className="font-medium">Text colour</span>
                </label>
                <div>
                  <span className="mb-1 block font-medium">Alignment</span>
                  <div className="flex gap-1">
                    {(['LEFT', 'CENTER', 'RIGHT'] as TextAlign[]).map((align) => (
                      <button key={align} type="button" onClick={() => changeBox(selectedBox.field, { align })}
                        className={`rounded px-2 py-1 ${selectedBox.align === align ? 'bg-brand text-white' : 'ring-1 ring-line'}`}>
                        {align.charAt(0) + align.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </fieldset>
        )}

        {props.canChange && (
          <div className="space-y-2">
            <ErrorBox error={props.saveError} />
            <Button busy={props.saving} disabled={!hasUnsavedChanges} onClick={() => props.onSave(fields)}>
              {hasUnsavedChanges ? 'Save layout' : 'Layout saved'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
