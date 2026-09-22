# UI Redesign with shadcn/ui — Design

Date: 2026-09-22
Status: Approved

## Goal

Replace the basic look with a polished, warm and elegant design built on **shadcn/ui**
(on our existing Tailwind), across every screen — including all tables. No backend changes.

## Visual style (warm & elegant)

- Colours: deep wine primary `#7A1F3D`, blush/rose secondary, warm **gold** accent (`#C8A15A`)
  for small highlights, warm ivory background. A warm charcoal **dark mode**.
- Fonts: **Playfair Display** for page titles and big numbers, **Inter** for everything else.
- Soft rounded corners (0.75rem), gentle shadows, generous spacing.
- Vendors' own brand colours stay on guest-facing cards and invitation pages.

## Building blocks

- shadcn/ui components copied into `src/components/ui/` (readable, ours to change),
  lucide icons, sonner toasts, recharts charts, date picker (calendar + popover).
- Our small helpers (`PageTitle`, `Button` with busy state, `TextField`, `SelectField`,
  `ErrorBox`, ...) are rebuilt on shadcn in `src/components/shared.tsx`, so every page gets the
  new look at once, then pages are refined one by one.
- Browser `confirm()` boxes are replaced by a shadcn confirmation dialog.
- **Tables:** one reusable `DataTable` (shadcn table + TanStack Table): sortable headers,
  row "⋯" action menus, row checkboxes where selection is useful, pagination (server-side for
  guests), column visibility, status badges, skeleton rows, friendly empty states.
  Used for guests, staff, companies, payments, credit statement, plans.

## Screens (in 4 stages)

1. **Foundation:** theme tokens + dark mode, app shell (collapsible icon sidebar, mobile
   slide-out, top bar with breadcrumbs + user menu), shared pieces, toasts, confirm dialog;
   two-panel login / sign-up / accept-invitation pages.
2. **Events & guests:** event cards, event page header + tabs, guest DataTable, upload as a
   step-by-step dialog, date/time pickers.
3. **Card design, Send cards, Plan & credits, company, staff, platform admin** (tables).
4. **Guest invitation page, check-in screen, new Dashboard home** (upcoming events, guests &
   seats, credits, RSVP breakdown chart — from existing API data).

Each stage must build cleanly and be checked in the browser before the next.
