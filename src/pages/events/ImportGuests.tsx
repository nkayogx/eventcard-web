// Uploading a guest list from Excel or CSV:
//   1. (optional) download the template
//   2. choose a file -> we "check" it and show a preview (nothing saved yet)
//   3. press Import -> the good rows are saved

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type ChangeEvent } from 'react'
import { api } from '../../api/apiClient'
import type { EventDetails, ImportDuplicate, ImportPreview, ImportProblem, ImportResult } from '../../api/types'
import { Button, Card, ErrorBox, SuccessBox } from '../../components/shared'
import { Link } from 'react-router-dom'
import { countOf } from './eventHelpers'

function asUpload(file: File): FormData {
  const upload = new FormData()
  upload.append('file', file)
  return upload
}

export function ImportGuests({ event, onClose }: { event: EventDetails; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)

  const check = useMutation({
    mutationFn: (chosenFile: File) =>
      api.post<ImportPreview>(`/api/events/${event.id}/guests/import/check`, asUpload(chosenFile)),
  })

  const runImport = useMutation({
    mutationFn: (chosenFile: File) =>
      api.post<ImportResult>(`/api/events/${event.id}/guests/import`, asUpload(chosenFile)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', event.id] })
      queryClient.invalidateQueries({ queryKey: ['event', event.id] })
    },
  })

  const downloadTemplate = useMutation({
    mutationFn: () => api.downloadFile(`/api/events/${event.id}/guests/import/template`, 'guest-list-template.xlsx'),
  })

  function chooseFile(changeEvent: ChangeEvent<HTMLInputElement>) {
    const chosen = changeEvent.target.files?.[0]
    changeEvent.target.value = '' // lets you choose the same file again after fixing it
    if (!chosen) return
    setFile(chosen)
    runImport.reset()
    check.mutate(chosen)
  }

  const preview = check.data
  const result = runImport.data

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upload guest list</h2>
        <button onClick={onClose} className="text-sm text-brand hover:underline">← Back to guests</button>
      </div>

      {result ? (
        <Card className="space-y-4">
          <SuccessBox>
            {result.importedCount} {result.importedCount === 1 ? 'guest was' : 'guests were'} added to the guest list.
          </SuccessBox>
          <RowProblems problems={result.problems} duplicates={result.duplicates} skipped />
          <Button onClick={onClose}>See guest list</Button>
        </Card>
      ) : (
        <>
          <Card className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Use an Excel (.xlsx) or CSV file. The first row must have the column headings.</li>
              <li>
                Columns: <strong>Name</strong> and <strong>Phone</strong> (required),{' '}
                <strong>Card type</strong>, <strong>Group</strong>, <strong>Notes</strong> (optional).
              </li>
              <li>
                Card types for this event: {event.cardTypes.map((cardType) => cardType.name).join(', ')}.
                An empty card type means {event.cardTypes[0]?.name}.
              </li>
            </ol>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                {check.isPending ? 'Checking file…' : file ? 'Choose another file' : 'Choose file'}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={chooseFile} />
              </label>
              <Button look="secondary" busy={downloadTemplate.isPending} onClick={() => downloadTemplate.mutate()}>
                Download template
              </Button>
              {file && <span className="text-sm text-ink-soft">{file.name}</span>}
            </div>
            {check.error && <p className="text-sm text-danger">{(check.error as Error).message}</p>}
            <ErrorBox error={downloadTemplate.error} />
          </Card>

          {preview && file && (
            <Card className="space-y-4">
              <h3 className="font-semibold">Preview</h3>
              <p className="text-sm">
                <span className="font-semibold text-success">✔ {countOf(preview.readyCount, 'guest')} ready</span>
                {preview.problems.length > 0 && <> · <span className="text-danger">{countOf(preview.problems.length, 'row')} with problems</span></>}
                {preview.duplicates.length > 0 && <> · <span className="text-ink-soft">{countOf(preview.duplicates.length, 'duplicate')} will be skipped</span></>}
              </p>

              {preview.readyExamples.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-ink-soft">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Row</th>
                        <th className="py-2 pr-4 font-medium">Name on card</th>
                        <th className="py-2 pr-4 font-medium">Phone</th>
                        <th className="py-2 pr-4 font-medium">Card</th>
                        <th className="py-2 font-medium">Group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.readyExamples.map((row) => (
                        <tr key={row.row} className="border-t border-line">
                          <td className="py-2 pr-4 text-ink-soft">{row.row}</td>
                          <td className="py-2 pr-4">{row.nameOnCard}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">{row.phone}</td>
                          <td className="py-2 pr-4">{row.cardType}</td>
                          <td className="py-2 text-ink-soft">{row.groupName ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.readyCount > preview.readyExamples.length && (
                    <p className="mt-2 text-xs text-ink-soft">…and {preview.readyCount - preview.readyExamples.length} more.</p>
                  )}
                </div>
              )}

              <RowProblems problems={preview.problems} duplicates={preview.duplicates} />

              {preview.remainingGuestsOnPlan !== null && preview.readyCount > preview.remainingGuestsOnPlan && (
                <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm">
                  Your plan allows {countOf(preview.remainingGuestsOnPlan, 'more guest')} for this event, but this file
                  has {preview.readyCount}. Remove some rows, or <Link to="/billing" className="underline">upgrade your plan</Link>.
                </p>
              )}

              {preview.problems.length > 0 && preview.readyCount > 0 && (
                <p className="text-sm text-ink-soft">
                  You can fix the file and choose it again, or import the {countOf(preview.readyCount, 'good row')} now.
                </p>
              )}
              <ErrorBox error={runImport.error} />
              <Button disabled={preview.readyCount === 0} busy={runImport.isPending} onClick={() => runImport.mutate(file)}>
                Import {countOf(preview.readyCount, 'guest')}
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function RowProblems(props: { problems: ImportProblem[]; duplicates: ImportDuplicate[]; skipped?: boolean }) {
  if (props.problems.length === 0 && props.duplicates.length === 0) return null
  return (
    <div className="space-y-3 text-sm">
      {props.problems.length > 0 && (
        <div className="rounded-lg bg-danger-soft p-3">
          <p className="font-medium text-danger">{props.skipped ? 'Not imported (problems):' : 'Rows with problems:'}</p>
          <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
            {props.problems.map((problem) => (
              <li key={problem.row}>Row {problem.row}: {problem.message}</li>
            ))}
          </ul>
        </div>
      )}
      {props.duplicates.length > 0 && (
        <div className="rounded-lg bg-paper p-3">
          <p className="font-medium">Duplicates (phone already on the list):</p>
          <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-ink-soft">
            {props.duplicates.map((duplicate) => (
              <li key={duplicate.row}>Row {duplicate.row}: {duplicate.nameOnCard} ({duplicate.phone})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
