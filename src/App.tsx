import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useState, useCallback, useEffect } from 'react'
import { RequireAuth, RequireRole } from '@/components/route-guard'
import { AppShell } from '@/components/app-shell'
import { AdminLayout as AdminLayoutRoute } from '@/components/admin-layout'
import { LeaderLayout as LeaderLayoutRoute } from '@/components/leader-layout'
import { PageTransition } from '@/components/page-transition'
import { KeepAlive } from '@/components/keep-alive'
import { MaintenanceMode } from '@/components/maintenance-mode'
import { useAppUpdate } from '@/hooks/use-app-update'
import { useDeepLink } from '@/hooks/use-deep-link'
import SplashPage from '@/pages/splash'

/* ------------------------------------------------------------------ */
/*  Lazy-loaded pages                                                  */
/* ------------------------------------------------------------------ */

// Public pages (no auth required)
const PublicEventPage = lazy(() => import('@/pages/public/event'))
const PublicCollectivePage = lazy(() => import('@/pages/public/collective'))
const DownloadPage = lazy(() => import('@/pages/public/download'))


// Legal
const TermsOfServicePage = lazy(() => import('@/pages/legal/terms'))
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/privacy'))

// Public / Auth
const WelcomePage = lazy(() => import('@/pages/auth/welcome'))
const SignUpPage = lazy(() => import('@/pages/auth/sign-up'))
const LoginPage = lazy(() => import('@/pages/auth/login'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password'))
const EmailVerificationPage = lazy(() => import('@/pages/auth/email-verification'))
const SuspendedAccountPage = lazy(() => import('@/pages/auth/suspended-account'))
const AcceptTermsPage = lazy(() => import('@/pages/auth/accept-terms'))

// Onboarding
const OnboardingPage = lazy(() => import('@/pages/onboarding/onboarding'))
const LeaderWelcomePage = lazy(() => import('@/pages/onboarding/leader-welcome'))
const WelcomeBackPage = lazy(() => import('@/pages/onboarding/welcome-back'))

// Main app
const HomePage = lazy(() => import('@/pages/home'))

// Collectives
const CollectiveDetailPage = lazy(() => import('@/pages/collectives/collective-detail'))
const DiscoverCollectivesPage = lazy(() => import('@/pages/collectives/discover'))
const CollectiveManagePage = lazy(() => import('@/pages/collectives/manage'))

// Chat
const ChatListPage = lazy(() => import('@/pages/chat/index'))
const CollectiveChatPage = lazy(() => import('@/pages/chat/collective-chat'))
const ChannelChatPage = lazy(() => import('@/pages/chat/channel-chat'))

// Tasks (staff)
const TasksPage = lazy(() => import('@/pages/tasks/index'))

// Settings
const SettingsPage = lazy(() => import('@/pages/settings/index'))

// Profile, Impact
const ProfilePage = lazy(() => import('@/pages/profile/index'))
const ViewProfilePage = lazy(() => import('@/pages/profile/view-profile'))
const EditProfilePage = lazy(() => import('@/pages/profile/edit-profile'))

const ReferralPage = lazy(() => import('@/pages/referral/index'))

// Events
const EventsPage = lazy(() => import('@/pages/events/index'))
const EventDetailPage = lazy(() => import('@/pages/events/event-detail'))
const CreateEventPage = lazy(() => import('@/pages/events/create-event'))
const CheckInPage = lazy(() => import('@/pages/events/check-in'))
const ProfileSurveyPage = lazy(() => import('@/pages/events/profile-survey'))
const EventDayPage = lazy(() => import('@/pages/events/event-day'))
const LogImpactPage = lazy(() => import('@/pages/events/log-impact'))
const PostEventSurveyPage = lazy(() => import('@/pages/events/post-event-survey'))
const EditEventPage = lazy(() => import('@/pages/events/edit-event'))


// Notifications
const NotificationsPage = lazy(() => import('@/pages/notifications/index'))

// Announcements
const AnnouncementsPage = lazy(() => import('@/pages/announcements/index'))
const CreateAnnouncementPage = lazy(() => import('@/pages/announcements/create'))

// Donations
const DonatePage = lazy(() => import('@/pages/donate/index'))
const DonateThankYouPage = lazy(() => import('@/pages/donate/thank-you'))
const DonorWallPage = lazy(() => import('@/pages/donate/donor-wall'))

// Shop
const ShopPage = lazy(() => import('@/pages/shop/index'))
const ProductDetailPage = lazy(() => import('@/pages/shop/product-detail'))
const CartPage = lazy(() => import('@/pages/shop/cart'))
const CheckoutPage = lazy(() => import('@/pages/shop/checkout'))
const OrderConfirmationPage = lazy(() => import('@/pages/shop/order-confirmation'))
const OrdersPage = lazy(() => import('@/pages/shop/orders'))
const OrderDetailPage = lazy(() => import('@/pages/shop/order-detail'))

// Admin - Merch
const AdminMerchPage = lazy(() => import('@/pages/admin/merch/index'))


// Admin - Dashboards & Management
const AdminDashboardPage = lazy(() => import('@/pages/admin/index'))
const AdminCollectivesPage = lazy(() => import('@/pages/admin/collectives'))
const AdminCollectiveDetailPage = lazy(() => import('@/pages/admin/collective-detail'))
const AdminUsersPage = lazy(() => import('@/pages/admin/users'))
const AdminEventsPage = lazy(() => import('@/pages/admin/events'))
const AdminSurveysPage = lazy(() => import('@/pages/admin/surveys'))
const AdminApplicationsPage = lazy(() => import('@/pages/admin/applications'))
const AdminCreateSurveyPage = lazy(() => import('@/pages/admin/create-survey'))
const AdminAuditLogPage = lazy(() => import('@/pages/admin/audit-log'))
const AdminSystemPage = lazy(() => import('@/pages/admin/system'))
const AdminBrandingPage = lazy(() => import('@/pages/admin/branding'))
const AdminEmailPage = lazy(() => import('@/pages/admin/email'))
const AdminCharityPage = lazy(() => import('@/pages/admin/charity'))
const AdminExportsPage = lazy(() => import('@/pages/admin/exports'))
const AdminWorkflowsPage = lazy(() => import('@/pages/admin/workflows'))
const AdminCreatePage = lazy(() => import('@/pages/admin/create'))
const DevToolsPage = lazy(() => import('@/pages/admin/dev-tools'))
const AdminPartnersPage = lazy(() => import('@/pages/admin/partners'))
const AdminChallengesPage = lazy(() => import('@/pages/admin/challenges'))
const ModerationQueuePage = lazy(() => import('@/pages/admin/moderation/index'))

// Contact, Partners, Leadership
const ContactPage = lazy(() => import('@/pages/contact'))
const PartnersPage = lazy(() => import('@/pages/partners'))
const LeadershipPage = lazy(() => import('@/pages/leadership'))
const LeadACollectivePage = lazy(() => import('@/pages/lead-a-collective'))

// Leader Dashboard & sub-pages
const LeaderDashboardPage = lazy(() => import('@/pages/leader/index'))
const LeaderEventsPage = lazy(() => import('@/pages/leader/events'))
const LeaderTasksPage = lazy(() => import('@/pages/leader/tasks'))
const LeaderReportsPage = lazy(() => import('@/pages/reports/index'))

// Reports & National Impact
const ReportsPage = lazy(() => import('@/pages/reports/index'))
const NationalImpactPage = lazy(() => import('@/pages/impact/national'))

// Temp map page
const MapPage = lazy(() => import('@/pages/map'))

/* ------------------------------------------------------------------ */
/*  Loading fallback                                                   */
/* ------------------------------------------------------------------ */

function PageFallback() {
  // Minimal shimmer that matches the page background — prevents
  // jarring blank flashes while lazy chunks download.
  // The opacity animation is CSS-only (no JS) for zero overhead.
  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-surface-1 animate-pulse"
      style={{ opacity: 0.4 }}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Bare routes (no app shell chrome)                                  */
/* ------------------------------------------------------------------ */

const _bareRoutes = [
  '/welcome',
  '/signup',
  '/login',
  '/forgot-password',
  '/verify-email',
  '/suspended',
  '/accept-terms',
  '/onboarding',
  '/leader-welcome',
  '/welcome-back',
]

/* ------------------------------------------------------------------ */
/*  Scroll to top on route change                                      */
/* ------------------------------------------------------------------ */

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Instant scroll — smooth scroll-to-top fights with page transition
    // animations and causes visible content jumping
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const { maintenanceMode, maintenanceMessage } = useAppUpdate()
  useDeepLink()

  const handleSplashReady = useCallback(() => {
    setShowSplash(false)
  }, [])

  if (maintenanceMode) {
    return <MaintenanceMode message={maintenanceMessage} />
  }

  return (
    <>
    {showSplash && <SplashPage onReady={handleSplashReady} />}
    <ScrollToTop />
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* ---- Bare routes (no app shell) ---- */}
        <Route
          path="/welcome"
          element={
            <AppShell bare>
              <WelcomePage />
            </AppShell>
          }
        />
        <Route
          path="/signup"
          element={
            <AppShell bare>
              <SignUpPage />
            </AppShell>
          }
        />
        <Route
          path="/login"
          element={
            <AppShell bare>
              <LoginPage />
            </AppShell>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AppShell bare>
              <ForgotPasswordPage />
            </AppShell>
          }
        />
        <Route
          path="/verify-email"
          element={
            <AppShell bare>
              <EmailVerificationPage />
            </AppShell>
          }
        />
        <Route
          path="/suspended"
          element={
            <AppShell bare>
              <SuspendedAccountPage />
            </AppShell>
          }
        />
        <Route
          path="/accept-terms"
          element={
            <AppShell bare>
              <AcceptTermsPage />
            </AppShell>
          }
        />

        {/* ---- Onboarding (auth required, bare shell) ---- */}
        <Route
          path="/onboarding"
          element={
            <AppShell bare>
              <OnboardingPage />
            </AppShell>
          }
        />
        <Route
          path="/leader-welcome"
          element={
            <AppShell bare>
              <LeaderWelcomePage />
            </AppShell>
          }
        />
        <Route
          path="/welcome-back"
          element={
            <AppShell bare>
              <WelcomeBackPage />
            </AppShell>
          }
        />

        {/* ---- Map (auth required, bare shell - no sidebar/tabs) ---- */}
        <Route
          path="/map"
          element={
            <RequireAuth>
              <AppShell bare>
                <MapPage />
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ============================================================ */}
        {/*  Protected routes - AppShell mounted ONCE via layout route    */}
        {/* ============================================================ */}
        <Route element={<RequireAuth><AppShell><KeepAlive /></AppShell></RequireAuth>}>

          {/* ---- Member pages (with PageTransition) ---- */}
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="/events" element={<PageTransition><EventsPage /></PageTransition>} />
          <Route path="/events/create" element={<PageTransition><CreateEventPage /></PageTransition>} />
          <Route path="/events/:id" element={<PageTransition><EventDetailPage /></PageTransition>} />
          <Route path="/events/:id/check-in" element={<PageTransition><CheckInPage /></PageTransition>} />
          <Route path="/events/:id/profile-survey" element={<PageTransition><ProfileSurveyPage /></PageTransition>} />
          <Route path="/events/:id/day" element={<PageTransition><EventDayPage /></PageTransition>} />
          <Route path="/events/:id/impact" element={<PageTransition><LogImpactPage /></PageTransition>} />
          <Route path="/events/:id/survey" element={<PageTransition><PostEventSurveyPage /></PageTransition>} />
          <Route path="/events/:id/edit" element={<PageTransition><EditEventPage /></PageTransition>} />
          <Route path="/collectives" element={<PageTransition><DiscoverCollectivesPage /></PageTransition>} />
          <Route path="/collectives/:slug" element={<PageTransition><CollectiveDetailPage /></PageTransition>} />
          <Route path="/collectives/:slug/manage" element={<PageTransition><CollectiveManagePage /></PageTransition>} />
          <Route path="/tasks" element={<PageTransition><TasksPage /></PageTransition>} />
          <Route path="/chat" element={<PageTransition><ChatListPage /></PageTransition>} />
          <Route path="/chat/channel/:channelId" element={<PageTransition><ChannelChatPage /></PageTransition>} />
          <Route path="/chat/:collectiveId" element={<PageTransition><CollectiveChatPage /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="/profile/edit" element={<PageTransition><EditProfilePage /></PageTransition>} />
          <Route path="/profile/:userId" element={<PageTransition><ViewProfilePage /></PageTransition>} />
          <Route path="/impact" element={<Navigate to="/profile" replace />} />
          <Route path="/referral" element={<PageTransition><ReferralPage /></PageTransition>} />
          <Route path="/notifications" element={<PageTransition><NotificationsPage /></PageTransition>} />
          <Route path="/announcements" element={<PageTransition><AnnouncementsPage /></PageTransition>} />
          <Route path="/announcements/create" element={<RequireRole minRole="national_admin"><PageTransition><CreateAnnouncementPage /></PageTransition></RequireRole>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />

          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/partners" element={<PageTransition><PartnersPage /></PageTransition>} />
          <Route path="/leadership" element={<PageTransition><LeadershipPage /></PageTransition>} />
          <Route path="/lead-a-collective" element={<PageTransition><LeadACollectivePage /></PageTransition>} />
          <Route path="/donate" element={<PageTransition><DonatePage /></PageTransition>} />
          <Route path="/donate/thank-you" element={<PageTransition><DonateThankYouPage /></PageTransition>} />
          <Route path="/donate/donors" element={<PageTransition><DonorWallPage /></PageTransition>} />
          <Route path="/shop" element={<PageTransition><ShopPage /></PageTransition>} />
          <Route path="/shop/cart" element={<PageTransition><CartPage /></PageTransition>} />
          <Route path="/shop/checkout" element={<PageTransition><CheckoutPage /></PageTransition>} />
          <Route path="/shop/order-confirmation" element={<PageTransition><OrderConfirmationPage /></PageTransition>} />
          <Route path="/shop/orders" element={<PageTransition><OrdersPage /></PageTransition>} />
          <Route path="/shop/orders/:orderId" element={<PageTransition><OrderDetailPage /></PageTransition>} />
          <Route path="/shop/:slug" element={<PageTransition><ProductDetailPage /></PageTransition>} />
          <Route path="/reports" element={<PageTransition><ReportsPage /></PageTransition>} />
          <Route path="/impact/national" element={<PageTransition><NationalImpactPage /></PageTransition>} />

          {/* ---- Leader Dashboard & sub-pages ---- */}
          <Route path="/leader" element={<LeaderLayoutRoute />}>
            <Route index element={<LeaderDashboardPage />} />
            <Route path="events" element={<LeaderEventsPage />} />
            <Route path="events/create" element={<CreateEventPage />} />
            <Route path="tasks" element={<LeaderTasksPage />} />
            <Route path="reports" element={<LeaderReportsPage />} />
          </Route>

          {/* ---- Admin routes (staff+) ---- */}
          <Route path="/admin" element={<RequireRole minRole="national_staff"><AdminLayoutRoute /></RequireRole>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="collectives" element={<AdminCollectivesPage />} />
            <Route path="collectives/:collectiveId" element={<AdminCollectiveDetailPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="create" element={<AdminCreatePage />} />
            <Route path="workflows" element={<AdminWorkflowsPage />} />
            <Route path="events" element={<AdminEventsPage />} />
            <Route path="surveys" element={<AdminSurveysPage />} />
            <Route path="applications" element={<AdminApplicationsPage />} />
            <Route path="surveys/create" element={<AdminCreateSurveyPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="national-impact" element={<NationalImpactPage />} />
            <Route path="email" element={<AdminEmailPage />} />
            <Route path="charity" element={<AdminCharityPage />} />
            <Route path="exports" element={<AdminExportsPage />} />
            <Route path="audit-log" element={<AdminAuditLogPage />} />
            <Route path="system" element={<AdminSystemPage />} />
            <Route path="branding" element={<AdminBrandingPage />} />
            <Route path="shop" element={<AdminMerchPage />} />
            <Route path="partners" element={<AdminPartnersPage />} />
            <Route path="challenges" element={<AdminChallengesPage />} />
            <Route path="moderation" element={<ModerationQueuePage />} />
            <Route path="dev-tools" element={<DevToolsPage />} />
          </Route>

        </Route>

        {/* ---- Legal pages (no auth required) ---- */}
        <Route
          path="/terms"
          element={
            <AppShell bare>
              <TermsOfServicePage />
            </AppShell>
          }
        />
        <Route
          path="/privacy"
          element={
            <AppShell bare>
              <PrivacyPolicyPage />
            </AppShell>
          }
        />

        {/* ---- Public pages (no auth required) ---- */}
        <Route
          path="/event/:id"
          element={
            <AppShell bare>
              <PublicEventPage />
            </AppShell>
          }
        />
        <Route
          path="/collective/:slug"
          element={
            <AppShell bare>
              <PublicCollectivePage />
            </AppShell>
          }
        />
        <Route
          path="/download"
          element={
            <AppShell bare>
              <DownloadPage />
            </AppShell>
          }
        />

        {/* Catch-all: redirect to welcome */}
        <Route
          path="*"
          element={
            <AppShell bare>
              <WelcomePage />
            </AppShell>
          }
        />
      </Routes>
    </Suspense>
    </>
  )
}

/** Temporary placeholder for unbuilt pages */
function _PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <h1 className="font-heading text-2xl font-bold text-black">{title}</h1>
      <p className="mt-2 text-sm text-primary-400">Coming soon</p>
    </div>
  )
}

export default App
