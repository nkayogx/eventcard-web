// The shapes of the data the backend sends and receives.
// They mirror the Java "record" classes in the backend.

export type UserRole = 'OWNER' | 'MANAGER' | 'CHECK_IN_STAFF' | 'PLATFORM_ADMIN'

export type AccountStatus = 'ACTIVE' | 'SUSPENDED'

export interface CompanySummary {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  accountStatus: AccountStatus
  canSendMessages: boolean
}

/** "Who am I?" - company is null for platform admins. */
export interface Me {
  userId: string
  fullName: string
  email: string
  role: UserRole
  company: CompanySummary | null
}

export interface LoginResponse {
  token: string
  me: Me
}

export interface CustomDomainSetup {
  domain: string
  verified: boolean
  txtRecordName: string
  txtRecordValue: string
}

export interface CompanyDetails {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  contactPhone: string
  contactEmail: string
  address: string | null
  city: string | null
  countryCode: string
  timeZone: string
  primaryColor: string | null
  secondaryColor: string | null
  customDomain: CustomDomainSetup | null
  accountStatus: AccountStatus
  canSendMessages: boolean
  createdAt: string
}

export interface StaffMember {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: UserRole
  active: boolean
  createdAt: string
}

export interface InvitationCreated {
  email: string
  role: UserRole
  invitationLink: string
  expiresAt: string
}

export interface InvitationDetails {
  companyName: string
  email: string
  role: UserRole
}

export interface CompanyPage {
  companies: CompanyDetails[]
  page: number
  totalPages: number
  totalCompanies: number
}

/** Friendly names for roles, shown on screen. */
export const roleNames: Record<UserRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  CHECK_IN_STAFF: 'Check-in staff',
  PLATFORM_ADMIN: 'Platform admin',
}

// ---------- Events & guests ----------

export type EventType = 'WEDDING' | 'SEND_OFF' | 'KITCHEN_PARTY' | 'BIRTHDAY' | 'GRADUATION' | 'CONFERENCE' | 'OTHER'

export type EventStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED' | 'CANCELLED'

export const eventTypeNames: Record<EventType, string> = {
  WEDDING: 'Wedding',
  SEND_OFF: 'Send-off',
  KITCHEN_PARTY: 'Kitchen party',
  BIRTHDAY: 'Birthday',
  GRADUATION: 'Graduation',
  CONFERENCE: 'Conference',
  OTHER: 'Other',
}

export const eventStatusNames: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
}

export interface EventSummary {
  id: string
  name: string
  eventType: EventType
  startsAt: string
  venueName: string
  status: EventStatus
  totalCards: number
  totalSeats: number
}

export interface EventPage {
  events: EventSummary[]
  page: number
  totalPages: number
  totalEvents: number
}

export interface CardTypeDetails {
  id: string
  name: string
  seats: number
  cards: number
  seatsUsed: number
}

export interface GroupTotals {
  groupName: string | null
  cards: number
  seats: number
}

export interface EventDetails {
  id: string
  name: string
  eventType: EventType
  hostNames: string | null
  startsAt: string
  endsAt: string | null
  timeZone: string
  venueName: string
  venueAddress: string | null
  mapLink: string | null
  dressCode: string | null
  extraInfo: string | null
  contactPhone: string | null
  rsvpDeadline: string | null
  status: EventStatus
  allowedNextStatuses: EventStatus[]
  cardTypes: CardTypeDetails[]
  groups: GroupTotals[]
  totalCards: number
  totalSeats: number
}

export interface Guest {
  id: string
  nameOnCard: string
  phone: string
  cardTypeId: string
  cardTypeName: string
  seats: number
  groupName: string | null
  notes: string | null
}

export interface GuestPage {
  guests: Guest[]
  page: number
  totalPages: number
  totalGuests: number
  groupNames: string[]
}

export interface ImportProblem {
  row: number
  message: string
}

export interface ImportDuplicate {
  row: number
  nameOnCard: string
  phone: string
}

export interface ImportPreview {
  readyCount: number
  readyExamples: { row: number; nameOnCard: string; phone: string; cardType: string; groupName: string | null }[]
  problems: ImportProblem[]
  duplicates: ImportDuplicate[]
}

export interface ImportResult {
  importedCount: number
  problems: ImportProblem[]
  duplicates: ImportDuplicate[]
}
