// Shows the phone's back camera and reports every QR code it reads.
// Uses the @zxing/browser library. Camera access needs HTTPS (or localhost).

import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Called with the text inside the QR code (the guest's link). */
  onScan: (text: string) => void
  /** While paused (e.g. a result is on screen), readings are ignored. */
  paused: boolean
}

/** The same card held in front of the camera is read many times a second - ignore repeats for 3 seconds. */
const IGNORE_REPEATS_FOR_MS = 3000

export function QrScanner({ onScan, paused }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [problem, setProblem] = useState<string | null>(null)

  // Keep the latest values in refs, so the camera doesn't restart every time they change
  const pausedNow = useRef(paused)
  const onScanNow = useRef(onScan)
  const lastScan = useRef({ text: '', at: 0 })
  useEffect(() => {
    pausedNow.current = paused
    onScanNow.current = onScan
  }, [paused, onScan])

  useEffect(() => {
    if (!video.current) return
    let controls: IScannerControls | null = null
    let stopped = false

    new BrowserQRCodeReader()
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current, (result) => {
        if (!result || pausedNow.current) return
        const text = result.getText()
        const now = Date.now()
        if (text === lastScan.current.text && now - lastScan.current.at < IGNORE_REPEATS_FOR_MS) return
        lastScan.current = { text, at: now }
        onScanNow.current(text)
      })
      .then((startedControls) => {
        controls = startedControls
        if (stopped) startedControls.stop() // the page was closed while the camera was starting
      })
      .catch(() => {
        setProblem('The camera could not be opened. Allow camera access, or use Search instead.')
      })

    // Switch the camera off when leaving the page
    return () => {
      stopped = true
      controls?.stop()
    }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink">
      <video ref={video} className="aspect-square w-full object-cover" muted playsInline />
      {/* A frame to show where to hold the QR code */}
      <div className="pointer-events-none absolute inset-[18%] rounded-xl border-4 border-white/80" />
      {problem && <p className="absolute inset-x-0 bottom-0 bg-danger p-3 text-center text-sm text-white">{problem}</p>}
    </div>
  )
}
