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
  cnameTarget: string | null
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

/** A company in the platform admin's list, with its plan and credits. */
export interface CompanyRow {
  company: CompanyDetails
  planName: string
  planStatus: 'FREE' | 'ACTIVE' | 'IN_GRACE' | 'EXPIRED'
  planPaidUntil: string | null
  creditBalance: number
}

export interface CompanyPage {
  companies: CompanyRow[]
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
  rsvp: RsvpTotals
}

export interface RsvpTotals {
  attendingCards: number
  attendingPeople: number
  notAttendingCards: number
  noReplyCards: number
}

export type RsvpStatus = 'NO_REPLY' | 'ATTENDING' | 'NOT_ATTENDING'

export const rsvpNames: Record<RsvpStatus, string> = {
  NO_REPLY: 'No reply',
  ATTENDING: 'Attending',
  NOT_ATTENDING: 'Not attending',
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
  invitationCode: string
  invitationLink: string
  rsvpStatus: RsvpStatus
  rsvpPeople: number | null
  rsvpMessage: string | null
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
  remainingGuestsOnPlan: number | null
}

export interface ImportResult {
  importedCount: number
  problems: ImportProblem[]
  duplicates: ImportDuplicate[]
}

// ---------- Card design ----------

export type CardDesignKind = 'UPLOADED' | 'TEMPLATE'
export type CardTemplate = 'CLASSIC' | 'ELEGANT' | 'MODERN'
export type CardField = 'GUEST_NAME' | 'CARD_TYPE' | 'QR_CODE'
export type CardFont = 'PLAYFAIR' | 'PLAYFAIR_BOLD' | 'MONTSERRAT' | 'MONTSERRAT_BOLD' | 'GREAT_VIBES'
export type TextAlign = 'LEFT' | 'CENTER' | 'RIGHT'

export const templateNames: Record<CardTemplate, string> = {
  CLASSIC: 'Classic',
  ELEGANT: 'Elegant',
  MODERN: 'Modern',
}

export const fieldNames: Record<CardField, string> = {
  GUEST_NAME: 'Guest name',
  CARD_TYPE: 'Card type',
  QR_CODE: 'QR code',
}

export const fontNames: Record<CardFont, string> = {
  PLAYFAIR: 'Playfair (elegant)',
  PLAYFAIR_BOLD: 'Playfair bold',
  MONTSERRAT: 'Montserrat (clean)',
  MONTSERRAT_BOLD: 'Montserrat bold',
  GREAT_VIBES: 'Great Vibes (script)',
}

/** One box on an uploaded design. Positions and sizes are percent of the picture. */
export interface FieldSettings {
  field: CardField
  x: number
  y: number
  width: number
  height: number
  font: CardFont
  fontSize: number
  color: string
  align: TextAlign
  visible: boolean
}

export interface CardTypeLook {
  id: string
  name: string
  seats: number
  backgroundUrl: string | null
}

export interface CardDesignDetails {
  kind: CardDesignKind
  templateName: CardTemplate
  invitationText: string
  backgroundUrl: string | null
  width: number | null
  height: number | null
  version: number
  fields: FieldSettings[]
  cardTypes: CardTypeLook[]
}

// ---------- Public invitation page ----------

export interface InvitationPage {
  guestName: string
  cardTypeName: string
  seats: number
  cardImagePath: string
  rsvpStatus: RsvpStatus
  rsvpPeople: number | null
  rsvpMessage: string | null
  rsvpOpen: boolean
  rsvpDeadline: string | null
  event: {
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
  }
  company: { name: string; logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null }
}

// ---------- Plans, credits & payments ----------

export type PlanStatus = 'FREE' | 'ACTIVE' | 'IN_GRACE' | 'EXPIRED'
export type PaymentType = 'PLAN' | 'CREDITS'
export type PaymentStatus = 'WAITING_FOR_PAYMENT' | 'PAID' | 'REJECTED' | 'CANCELLED'
export type MessageChannel = 'SMS' | 'WHATSAPP'
export type CreditReason = 'PURCHASE' | 'MESSAGE_SENT' | 'MESSAGE_REFUND' | 'ADMIN_ADJUSTMENT'

/** A plan and its limits. null limits mean unlimited. */
export interface Plan {
  id: string
  code: string
  name: string
  monthlyPriceTzs: number
  maxActiveEvents: number | null
  maxGuestsPerEvent: number | null
  maxStaff: number | null
  allowsCustomDomain: boolean
  allowsOwnArtwork: boolean
  freePlan: boolean
  available: boolean
  sortOrder: number
}

export interface CreditPack {
  id: string
  name: string
  credits: number
  priceTzs: number
  available: boolean
  sortOrder: number
}

export interface MessagePrice {
  channel: MessageChannel
  credits: number
}

export interface PaymentInstructions {
  title: string
  steps: string[]
  amountTzs: number
  reference: string
}

export interface Payment {
  id: string
  reference: string
  type: PaymentType
  description: string
  amountTzs: number
  status: PaymentStatus
  payerPhone: string | null
  transactionReference: string | null
  submittedAt: string | null
  confirmedAt: string | null
  adminNote: string | null
  createdAt: string
  instructions: PaymentInstructions | null
  companyId: string | null
  companyName: string | null
}

export interface BillingOverview {
  plan: Plan
  planStatus: PlanStatus
  paidUntil: string | null
  graceEndsOn: string | null
  chosenPlanName: string | null
  usage: {
    activeEvents: number
    maxActiveEvents: number | null
    staff: number
    maxStaff: number | null
    maxGuestsPerEvent: number | null
  }
  creditBalance: number
  plansForSale: Plan[]
  packsForSale: CreditPack[]
  messagePrices: MessagePrice[]
  waitingPayments: Payment[]
}

export interface CreditMovement {
  id: string
  amount: number
  reason: CreditReason
  balanceAfter: number
  note: string | null
  createdAt: string
}

export interface CreditStatement {
  movements: CreditMovement[]
  page: number
  totalPages: number
}

export const creditReasonNames: Record<CreditReason, string> = {
  PURCHASE: 'Bought',
  MESSAGE_SENT: 'Message sent',
  MESSAGE_REFUND: 'Refund (message failed)',
  ADMIN_ADJUSTMENT: 'Adjusted by EventCard',
}

export const paymentStatusNames: Record<PaymentStatus, string> = {
  WAITING_FOR_PAYMENT: 'Waiting',
  PAID: 'Paid',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

/** "TSh 80,000" */
export function formatTzs(amount: number): string {
  return 'TSh ' + amount.toLocaleString('en-US')
}
