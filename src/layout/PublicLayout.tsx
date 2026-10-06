// The layout for pages you see before logging in (sign up, log in, accept invitation):
// a decorative wine-coloured panel on the left (computers only) and the form on the right.

import { MailOpenIcon, QrCodeIcon, SendIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function PublicLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <BrandPanel />
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <p className="mb-8 font-heading text-2xl font-semibold text-primary lg:hidden">EventCard</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  )
}

/** The left panel: our name, a short promise, and three things the product does. */
function BrandPanel() {
  const features = [
    { icon: MailOpenIcon, text: 'Beautiful digital cards with each guest\'s name' },
    { icon: SendIcon, text: 'Sent on WhatsApp and SMS in one click' },
    { icon: QrCodeIcon, text: 'Fast QR check-in at the door' },
  ]
  return (
    <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Soft decorative circles */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-gold/25 blur-3xl" />

      <p className="relative font-heading text-2xl font-semibold">EventCard</p>

      <div className="relative space-y-8">
        <h2 className="font-heading text-4xl leading-tight font-semibold">
          Invitations your guests
          <br />
          <span className="text-gold">will remember.</span>
        </h2>
        <ul className="space-y-4">
          {features.map((feature) => (
            <li key={feature.text} className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
                <feature.icon className="size-4" />
              </span>
              <span className="text-primary-foreground/90">{feature.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-sm text-primary-foreground/70">Weddings · Send-offs · Kitchen parties · Conferences</p>
    </aside>
  )
}
