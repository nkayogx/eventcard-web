// A nice "Are you sure?" box, instead of the browser's plain confirm() pop-up.
//
// Use it anywhere:
//   const confirm = useConfirm()
//   if (await confirm({ title: 'Cancel event?', confirmLabel: 'Cancel event', danger: true })) { ... }

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  /** Red button, for things that delete or cancel. */
  danger?: boolean
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  // The answer is handed back through this, when the person presses a button
  const answer = useRef<(yes: boolean) => void>(() => {})

  const confirm = useCallback<Confirm>((newOptions) => {
    setOptions(newOptions)
    return new Promise<boolean>((resolve) => {
      answer.current = resolve
    })
  }, [])

  function close(yes: boolean) {
    answer.current(yes)
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={options !== null} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">{options?.title}</AlertDialogTitle>
            {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={cn(options?.danger && 'bg-destructive text-white hover:bg-destructive/90')}>
              {options?.confirmLabel ?? 'Yes, continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}
