// The simple centred layout for pages you see before logging in
// (sign up, log in, accept invitation).

import type { ReactNode } from 'react'

export function PublicLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="mb-8 text-center text-lg font-semibold tracking-tight text-brand">EventCard</p>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
