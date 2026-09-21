// The layout for logged-in users: a side menu and the page on the right.
// The menu only shows the pages the user's role is allowed to use.

import { NavLink, Outlet } from 'react-router-dom'
import { roleNames, type UserRole } from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface MenuItem {
  to: string
  label: string
  roles: UserRole[]
}

const menu: MenuItem[] = [
  { to: '/company', label: 'Company profile', roles: ['OWNER', 'MANAGER', 'CHECK_IN_STAFF'] },
  { to: '/company/domain', label: 'Custom domain', roles: ['OWNER'] },
  { to: '/staff', label: 'Staff', roles: ['OWNER', 'MANAGER'] },
  { to: '/platform/companies', label: 'All companies', roles: ['PLATFORM_ADMIN'] },
]

export function AppLayout() {
  const { me, logOut } = useAuth()
  if (!me) return null

  const myMenu = menu.filter((item) => item.roles.includes(me.role))
  const sendingLocked = me.company !== null && !me.company.canSendMessages

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-white md:min-h-screen md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center gap-3 p-5">
          {me.company?.logoUrl ? (
            <img src={me.company.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
              {(me.company?.name ?? 'EventCard').charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{me.company?.name ?? 'EventCard'}</p>
            <p className="text-xs text-ink-soft">{roleNames[me.role]}</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {myMenu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-brand-soft font-medium text-brand' : 'text-ink-soft hover:bg-paper'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-line p-5 md:block">
          <p className="truncate text-sm">{me.fullName}</p>
          <p className="truncate text-xs text-ink-soft">{me.email}</p>
          <button onClick={logOut} className="mt-3 text-sm text-brand hover:underline">
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-8 md:px-10">
        {sendingLocked && (
          <div className="mb-6 rounded-lg bg-warning-soft px-4 py-3 text-sm">
            <strong>Sending is locked.</strong> You can set everything up now. WhatsApp and SMS sending will be
            unlocked once our team has verified your company.
          </div>
        )}
        <Outlet />
        <button onClick={logOut} className="mt-10 text-sm text-brand hover:underline md:hidden">
          Log out
        </button>
      </main>
    </div>
  )
}
