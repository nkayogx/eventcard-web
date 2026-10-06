// The frame around every page for logged-in users:
//   - a side menu (collapses to icons on computers, slides out on phones)
//   - a top bar with "where am I" breadcrumbs and the user menu
// The menu only shows the pages the user's role is allowed to use.

import {
  Building2Icon, CalendarHeartIcon, ChevronsUpDownIcon, CreditCardIcon, GlobeIcon, LayoutDashboardIcon,
  LockIcon, LogOutIcon, MoonIcon, ReceiptIcon, SunIcon, TagsIcon, UsersIcon, type LucideIcon,
} from 'lucide-react'
import { Fragment } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { roleNames, type UserRole } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from '@/components/ui/sidebar'
import { useTheme } from '@/theme/ThemeContext'

interface MenuItem {
  to: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
}

const COMPANY_ROLES: UserRole[] = ['OWNER', 'MANAGER', 'CHECK_IN_STAFF']

/** The side menu, in groups. */
const menuGroups: { label: string; items: MenuItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon, roles: ['OWNER', 'MANAGER'] },
      { to: '/events', label: 'Events', icon: CalendarHeartIcon, roles: COMPANY_ROLES },
    ],
  },
  {
    label: 'Company',
    items: [
      { to: '/company', label: 'Company profile', icon: Building2Icon, roles: COMPANY_ROLES },
      { to: '/company/domain', label: 'Custom domain', icon: GlobeIcon, roles: ['OWNER'] },
      { to: '/staff', label: 'Staff', icon: UsersIcon, roles: ['OWNER', 'MANAGER'] },
      { to: '/billing', label: 'Plan & credits', icon: CreditCardIcon, roles: ['OWNER', 'MANAGER'] },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/platform/companies', label: 'All companies', icon: Building2Icon, roles: ['PLATFORM_ADMIN'] },
      { to: '/platform/payments', label: 'Payments', icon: ReceiptIcon, roles: ['PLATFORM_ADMIN'] },
      { to: '/platform/pricing', label: 'Plans & prices', icon: TagsIcon, roles: ['PLATFORM_ADMIN'] },
    ],
  },
]

export function AppLayout() {
  const { me } = useAuth()
  if (!me) return null

  const sendingLocked = me.company !== null && !me.company.canSendMessages

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <PageBreadcrumbs />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {sendingLocked && (
            <Alert className="mb-6 border-gold/40 bg-warning-soft">
              <LockIcon className="text-warning" />
              <AlertDescription className="text-foreground">
                <p>
                  <strong>Sending is locked.</strong> You can set everything up now. WhatsApp and SMS sending will be
                  unlocked once our team has verified your company.
                </p>
              </AlertDescription>
            </Alert>
          )}
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar() {
  const { me } = useAuth()
  const { pathname } = useLocation()
  if (!me) return null

  const companyName = me.company?.name ?? 'EventCard'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <Avatar className="size-8 rounded-lg">
                  {me.company?.logoUrl && <AvatarImage src={me.company.logoUrl} className="object-contain" />}
                  <AvatarFallback className="rounded-lg bg-primary font-heading text-primary-foreground">
                    {companyName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-heading font-semibold">{companyName}</span>
                  <span className="truncate text-xs text-muted-foreground">{roleNames[me.role]}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => {
          const items = group.items.filter((item) => item.roles.includes(me.role))
          if (items.length === 0) return null
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    // "Events" stays highlighted on every event page; the others only on their own page
                    const isActive = item.to === '/events' ? pathname.startsWith('/events') : pathname === item.to
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <NavLink to={item.to}>
                            <item.icon />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** The person's name at the bottom of the menu; clicking it opens dark mode and log out. */
function UserMenu() {
  const { me, logOut } = useAuth()
  const { theme, setTheme } = useTheme()
  if (!me) return null
  const initials = me.fullName.split(' ').map((part) => part.charAt(0)).slice(0, 2).join('').toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{me.fullName}</span>
                <span className="truncate text-xs text-muted-foreground">{me.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="font-medium">{me.fullName}</p>
              <p className="text-xs text-muted-foreground">{roleNames[me.role]}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logOut} className="text-destructive focus:text-destructive">
              <LogOutIcon className="text-destructive" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** Names for the parts of a web address, e.g. /events/123/check-in -> Events > Event > Check-in */
const PAGE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  events: 'Events',
  new: 'New event',
  edit: 'Edit',
  'check-in': 'Check-in',
  company: 'Company profile',
  domain: 'Custom domain',
  staff: 'Staff',
  billing: 'Plan & credits',
  platform: 'Platform',
  companies: 'All companies',
  payments: 'Payments',
  pricing: 'Plans & prices',
}

function PageBreadcrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)

  const crumbs = parts.map((part, index) => ({
    // Parts that are not in the list (such as an event's id) are shown as "Event"
    label: PAGE_NAMES[part] ?? (parts[index - 1] === 'events' ? 'Event' : part),
    to: '/' + parts.slice(0, index + 1).join('/'),
  })).filter((crumb) => crumb.to !== '/platform')

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.to}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild><Link to={crumb.to}>{crumb.label}</Link></BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
