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
import { CompanyProfilePage } from './pages/CompanyProfilePage'
import { CustomDomainPage } from './pages/CustomDomainPage'
import { EventFormPage } from './pages/events/EventFormPage'
import { EventPage } from './pages/events/EventPage'
import { EventsPage } from './pages/events/EventsPage'
import { InvitationPage } from './pages/invitation/InvitationPage'
import { LoginPage } from './pages/LoginPage'
import { PlatformCompaniesPage } from './pages/PlatformCompaniesPage'
import { SignupPage } from './pages/SignupPage'
import { StaffPage } from './pages/StaffPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

/** "/" sends each person to the right first page for their role. */
function HomePage() {
  const { me } = useAuth()
  if (me?.role === 'PLATFORM_ADMIN') return <Navigate to="/platform/companies" replace />
  return <Navigate to="/events" replace />
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
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/new" element={
          <RequireLogin roles={['OWNER', 'MANAGER']}><EventFormPage /></RequireLogin>} />
        <Route path="/events/:eventId" element={<EventPage />} />
        <Route path="/events/:eventId/edit" element={
          <RequireLogin roles={['OWNER', 'MANAGER']}><EventFormPage /></RequireLogin>} />
        <Route path="/company" element={
          <RequireLogin roles={['OWNER', 'MANAGER', 'CHECK_IN_STAFF']}><CompanyProfilePage /></RequireLogin>} />
        <Route path="/company/domain" element={
          <RequireLogin roles={['OWNER']}><CustomDomainPage /></RequireLogin>} />
        <Route path="/staff" element={
          <RequireLogin roles={['OWNER', 'MANAGER']}><StaffPage /></RequireLogin>} />
        <Route path="/platform/companies" element={
          <RequireLogin roles={['PLATFORM_ADMIN']}><PlatformCompaniesPage /></RequireLogin>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
