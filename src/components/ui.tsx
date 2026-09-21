// Small building blocks used on every screen, so all pages look the same.

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ApiError } from '../api/apiClient'

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white p-6 ${className}`}>{children}</section>
}

type ButtonLook = 'primary' | 'secondary' | 'danger'

const buttonLooks: Record<ButtonLook, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-line bg-white text-ink hover:bg-paper',
  danger: 'border border-danger/30 bg-white text-danger hover:bg-danger-soft',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  look?: ButtonLook
  busy?: boolean
}

export function Button({ look = 'primary', busy = false, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition
        disabled:cursor-not-allowed disabled:opacity-60 ${buttonLooks[look]} ${className}`}
    >
      {busy ? 'Please wait…' : children}
    </button>
  )
}

/** Shows the error under the field it belongs to (the backend tells us the field name). */
function FieldError({ error, field }: { error: unknown; field: string }) {
  if (error instanceof ApiError && error.field === field) {
    return <p className="mt-1 text-sm text-danger">{error.message}</p>
  }
  return null
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  hint?: string
  error?: unknown
}

export function TextField({ label, name, hint, error, ...rest }: TextFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
      <FieldError error={error} field={name} />
    </label>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  name: string
  options: { value: string; label: string }[]
  error?: unknown
}

export function SelectField({ label, name, options, error, ...rest }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select
        name={name}
        {...rest}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError error={error} field={name} />
    </label>
  )
}

/** Shows an error that is not about one specific field (e.g. "Wrong email or password"). */
export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  if (error instanceof ApiError && error.field) return null // already shown under the field
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{message}</p>
}

export function SuccessBox({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">{children}</p>
}

export function StatusBadge({ good, children }: { good: boolean; children: ReactNode }) {
  const look = good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${look}`}>{children}</span>
}
