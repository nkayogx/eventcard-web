// The starting point of the React app: sets up data loading, login state and the list of pages.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { RequireLogin } from './auth/RequireLogin'
import './index.css'
import { AppLayout } from './layout/AppLayout'
import { AcceptInvitationPage } from './pages/AcceptInvitationPage'
import { BillingPage } from './pages/billing/BillingPage'
import { CompanyProfilePage } from './pages/CompanyProfilePage'
import { CustomDomainPage } from './pages/CustomDomainPage'
import { DashboardPage } from './pages/DashboardPage'
import { EventFormPage } from './pages/events/EventFormPage'
import { EventPage } from './pages/events/EventPage'
import { EventsPage } from './pages/events/EventsPage'
import { InvitationPage } from './pages/invitation/InvitationPage'
import { CheckInPage } from './pages/checkin/CheckInPage'
import { LoginPage } from './pages/LoginPage'
import { PlatformCompaniesPage } from './pages/PlatformCompaniesPage'
import { PlatformPaymentsPage } from './pages/platform/PlatformPaymentsPage'
import { PlatformPricingPage } from './pages/platform/PlatformPricingPage'
import { SignupPage } from './pages/SignupPage'
import { StaffPage } from './pages/StaffPage'
import { ConfirmProvider } from './components/ConfirmDialog'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { ThemeProvider } from './theme/ThemeContext'

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

/** "/" sends each person to the right first page for their role. */
function HomePage() {
  const { me } = useAuth()
  if (me?.role === 'PLATFORM_ADMIN') return <Navigate to="/platform/companies" replace />
  if (me?.role === 'CHECK_IN_STAFF') return <Navigate to="/events" replace />
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <Routes>
      {/* Pages anyone can open */}
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invitation/:code" element={<AcceptInvitationPage />} />
      {/* A guest's personal invitation (from the link or QR code on their card) */}
      <Route path="/i/:code" element={<InvitationPage />} />

      {/* Pages that need a login */}
      <Route element={<RequireLogin><AppLayout /></RequireLogin>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={
          <RequireLogin roles={['OWNER', 'MANAGER']}><DashboardPage /></RequireLogin>} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/new" element={
          <RequireLogin roles={['OWNER', 'MANAGER']}><EventFormPage /></RequireLogin>} />
        <Route path="/events/:eventId" element={<EventPage />} />
        <Route path="/events/:eventId/check-in" element={<CheckInPage />} />
        <Route path="/events/:eventId/edit" element={
          <RequireLogin roles={['OWNER', 'MANAGER']}><EventFormPage /></RequireLogin>} />
        <Route path="/company" element={
          <RequireLogin roles={['OWNER', 'MANAGER', 'CHECK_IN_STAFF']}><CompanyProfilePage /></RequireLogin>} />
        <Route path="/company/domain" element={
          <RequireLogin roles={['OWNER']}><CustomDomainPage /></RequireLogin>} />
        <Route path="/staff" element={
          <RequireLogin roles={['OWNER', 'MANAGER']}><StaffPage /></RequireLogin>} />
        <Route path="/billing" element={
          <RequireLogin roles={['OWNER', 'MANAGER']}><BillingPage /></RequireLogin>} />
        <Route path="/platform/payments" element={
          <RequireLogin roles={['PLATFORM_ADMIN']}><PlatformPaymentsPage /></RequireLogin>} />
        <Route path="/platform/pricing" element={
          <RequireLogin roles={['PLATFORM_ADMIN']}><PlatformPricingPage /></RequireLogin>} />
        <Route path="/platform/companies" element={
          <RequireLogin roles={['PLATFORM_ADMIN']}><PlatformCompaniesPage /></RequireLogin>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <ConfirmProvider>
                <App />
                {/* Small pop-up messages such as "Guest added" */}
                <Toaster position="top-center" richColors />
              </ConfirmProvider>
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
