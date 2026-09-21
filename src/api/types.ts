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
