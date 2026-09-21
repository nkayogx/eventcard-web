// A pop-up showing a card image (a preview, or a real guest's card), with a download button.

import { useMutation } from '@tanstack/react-query'
import { api } from '../../api/apiClient'
import { AuthorizedImage } from '../../components/AuthorizedImage'
import { Button } from '../../components/ui'

interface Props {
  title: string
  imagePath: string
  downloadName: string
  onClose: () => void
}

export function CardPreviewDialog({ title, imagePath, downloadName, onClose }: Props) {
  const download = useMutation({ mutationFn: () => api.downloadFile(imagePath, downloadName) })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(clickEvent) => clickEvent.stopPropagation()} // clicks inside don't close it
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-ink-soft hover:text-ink">Close</button>
        </div>
        <AuthorizedImage path={imagePath} alt={title} className="w-full rounded-lg border border-line" />
        <div className="mt-4 flex gap-2">
          <Button look="secondary" busy={download.isPending} onClick={() => download.mutate()}>Download</Button>
        </div>
      </div>
    </div>
  )
}
