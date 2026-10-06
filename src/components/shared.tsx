// Small building blocks used on every screen, built on shadcn/ui (the files in components/ui).
// Pages use these, so all screens look the same and stay short.

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from 'lucide-react'
import type { ComponentProps, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/api/apiClient'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button as ShadcnButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** The title at the top of a page, with an optional line below and buttons on the right. */
export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** A white panel with a soft border and shadow. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-6 text-card-foreground shadow-sm', className)}>
      {children}
    </section>
  )
}

type ButtonLook = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends Omit<ComponentProps<typeof ShadcnButton>, 'variant'> {
  look?: ButtonLook
  /** Shows a spinning circle and blocks clicks while something is being saved. */
  busy?: boolean
}

export function Button({ look = 'primary', busy = false, children, className, disabled, ...rest }: ButtonProps) {
  const variants = {
    primary: 'default',
    secondary: 'outline',
    danger: 'outline',
    ghost: 'ghost',
  } as const
  return (
    <ShadcnButton
      {...rest}
      variant={variants[look]}
      disabled={busy || disabled}
      className={cn(look === 'danger' && 'border-destructive/40 text-destructive hover:bg-danger-soft hover:text-destructive', className)}
    >
      {busy && <Loader2Icon className="animate-spin" />}
      {children}
    </ShadcnButton>
  )
}

/** Shows the error under the field it belongs to (the backend tells us the field name). */
function FieldError({ error, field }: { error: unknown; field: string }) {
  if (error instanceof ApiError && error.field === field) {
    return <p className="text-sm text-destructive">{error.message}</p>
  }
  return null
}

function hasErrorFor(error: unknown, field: string): boolean {
  return error instanceof ApiError && error.field === field
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  hint?: string
  error?: unknown
}

/** A labelled text box, with a hint and the field's error message underneath. */
export function TextField({ label, name, hint, error, className, ...rest }: TextFieldProps) {
  const id = rest.id ?? `field-${name}`
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-invalid={hasErrorFor(error, name)} {...rest} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError error={error} field={name} />
    </div>
  )
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string
  name: string
  options: { value: string; label: string }[]
  error?: unknown
}

/** A labelled drop-down list. */
export function SelectField({ label, name, options, error, className, ...rest }: SelectFieldProps) {
  const id = rest.id ?? `field-${name}`
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} name={name} aria-invalid={hasErrorFor(error, name)} className="w-full" {...rest}>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldError error={error} field={name} />
    </div>
  )
}

/**
 * Shows an error that is not about one specific field (e.g. "Wrong email or password").
 * Plan-limit errors (field "plan") also get a link to the "Plan & credits" page.
 */
export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  const isPlanLimit = error instanceof ApiError && error.field === 'plan'
  if (error instanceof ApiError && error.field && !isPlanLimit) return null // already shown under the field
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <Alert variant="destructive" className="border-destructive/30 bg-danger-soft">
      <AlertCircleIcon />
      <AlertDescription className="text-destructive">
        <p>
          {message}
          {isPlanLimit && (
            <> <Link to="/billing" className="font-medium underline">See plans</Link></>
          )}
        </p>
      </AlertDescription>
    </Alert>
  )
}

export function SuccessBox({ children }: { children: ReactNode }) {
  return (
    <Alert className="border-success/30 bg-success-soft text-success">
      <CheckCircle2Icon />
      <AlertDescription className="text-success">{children}</AlertDescription>
    </Alert>
  )
}

/** A small coloured label: green for good things, red for problems. */
export function StatusBadge({ good, children }: { good: boolean; children: ReactNode }) {
  return (
    <Badge variant="outline"
      className={good ? 'border-success/30 bg-success-soft text-success' : 'border-destructive/30 bg-danger-soft text-destructive'}>
      {children}
    </Badge>
  )
}

/** Grey placeholder blocks shown while a page is loading. */
export function LoadingBlocks({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />)}
    </div>
  )
}

/** A friendly message when a list is empty, with an optional button. */
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      {icon && <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">{icon}</div>}
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
