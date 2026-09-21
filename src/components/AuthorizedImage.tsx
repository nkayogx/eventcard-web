// Shows a picture that needs a login (card previews, guest cards).
// A normal <img src> cannot send the login token, so we download the picture ourselves.

import { useEffect, useState } from 'react'
import { api } from '../api/apiClient'

interface Props {
  path: string // e.g. /api/events/123/card-design/preview.png
  alt: string
  className?: string
}

export function AuthorizedImage({ path, alt, className = '' }: Props) {
  const [address, setAddress] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let stillWanted = true
    let createdAddress: string | null = null
    setAddress(null)
    setProblem(null)

    api
      .imageAddress(path)
      .then((newAddress) => {
        createdAddress = newAddress
        if (stillWanted) setAddress(newAddress)
      })
      .catch((error: Error) => {
        if (stillWanted) setProblem(error.message)
      })

    // When the picture changes or disappears, free the browser memory it used
    return () => {
      stillWanted = false
      if (createdAddress) URL.revokeObjectURL(createdAddress)
    }
  }, [path])

  if (problem) return <p className="p-4 text-sm text-danger">{problem}</p>
  if (!address) {
    return <div className={`animate-pulse bg-line/60 ${className}`} style={{ aspectRatio: '4 / 5' }} aria-label="Loading picture" />
  }
  return <img src={address} alt={alt} className={className} />
}
