import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useState, useCallback } from 'react'
import { RequireAuth, RequireRole } from '@/components/route-guard'
import { AppShell } from '@/components/app-shell'
import { AdminLayout as AdminLayoutRoute } from '@/components/admin-layout'
import { PageTransition } from '@/components/page-transition'
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
const ExplorePage = lazy(() => import('@/pages/explore'))

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

// Profile, Impact, Gamification
const ProfilePage = lazy(() => import('@/pages/profile/index'))
const ViewProfilePage = lazy(() => import('@/pages/profile/view-profile'))
const EditProfilePage = lazy(() => import('@/pages/profile/edit-profile'))
const ImpactDashboardPage = lazy(() => import('@/pages/impact/index'))
const LeaderboardPage = lazy(() => import('@/pages/leaderboard/index'))
const PointsPage = lazy(() => import('@/pages/points/index'))
const ReferralPage = lazy(() => import('@/pages/referral/index'))

// Events
const MyEventsPage = lazy(() => import('@/pages/events/index'))
const EventDetailPage = lazy(() => import('@/pages/events/event-detail'))
const CreateEventPage = lazy(() => import('@/pages/events/create-event'))
const CheckInPage = lazy(() => import('@/pages/events/check-in'))
const EventDayPage = lazy(() => import('@/pages/events/event-day'))
const LogImpactPage = lazy(() => import('@/pages/events/log-impact'))
const PostEventSurveyPage = lazy(() => import('@/pages/events/post-event-survey'))
const EditEventPage = lazy(() => import('@/pages/events/edit-event'))

// Community / Feed
const FeedPage = lazy(() => import('@/pages/community/feed'))
const CreatePostPage = lazy(() => import('@/pages/community/create-post'))

// Notifications
const NotificationsPage = lazy(() => import('@/pages/notifications/index'))

// Announcements
const AnnouncementsPage = lazy(() => import('@/pages/announcements/index'))
const CreateAnnouncementPage = lazy(() => import('@/pages/announcements/create'))

// Membership
const MembershipPage = lazy(() => import('@/pages/membership/index'))

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

// Admin - Membership
const AdminMembershipPage = lazy(() => import('@/pages/admin/membership'))

// Admin - Merch
const AdminMerchPage = lazy(() => import('@/pages/admin/merch/index'))

// Admin - Moderation
const ModerationQueuePage = lazy(() => import('@/pages/admin/moderation/index'))

// Admin - Dashboards & Management
const AdminDashboardPage = lazy(() => import('@/pages/admin/index'))
const AdminCollectivesPage = lazy(() => import('@/pages/admin/collectives'))
const AdminCollectiveDetailPage = lazy(() => import('@/pages/admin/collective-detail'))
const AdminUsersPage = lazy(() => import('@/pages/admin/users'))
const AdminEventsPage = lazy(() => import('@/pages/admin/events'))
const AdminPartnersPage = lazy(() => import('@/pages/admin/partners'))
const AdminChallengesPage = lazy(() => import('@/pages/admin/challenges'))
const AdminSurveysPage = lazy(() => import('@/pages/admin/surveys'))
const AdminCreateSurveyPage = lazy(() => import('@/pages/admin/create-survey'))
const AdminAuditLogPage = lazy(() => import('@/pages/admin/audit-log'))
const AdminSystemPage = lazy(() => import('@/pages/admin/system'))
const AdminEmailPage = lazy(() => import('@/pages/admin/email'))
const AdminCharityPage = lazy(() => import('@/pages/admin/charity'))
const AdminExportsPage = lazy(() => import('@/pages/admin/exports'))
const AdminWorkflowsPage = lazy(() => import('@/pages/admin/workflows'))
const SuperAdminPage = lazy(() => import('@/pages/admin/super/index'))
const DevToolsPage = lazy(() => import('@/pages/admin/dev-tools'))

// More (hub page)
const MorePage = lazy(() => import('@/pages/more'))

// Leader Dashboard
const LeaderDashboardPage = lazy(() => import('@/pages/leader/index'))

// Reports & National Impact
const ReportsPage = lazy(() => import('@/pages/reports/index'))
const NationalImpactPage = lazy(() => import('@/pages/impact/national'))

/* ------------------------------------------------------------------ */
/*  Loading fallback                                                   */
/* ------------------------------------------------------------------ */

function PageFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
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

        {/* ---- Protected routes (full app shell) ---- */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <HomePage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* Placeholder routes for tab bar navigation */}
        <Route
          path="/explore"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ExplorePage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/events"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <MyEventsPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/events/create"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <CreateEventPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/events/:id"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <EventDetailPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/events/:id/check-in"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <CheckInPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/events/:id/day"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <EventDayPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/events/:id/impact"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <LogImpactPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/events/:id/survey"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <PostEventSurveyPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <EditEventPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/community"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <FeedPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/community/create-post"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <CreatePostPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        {/* ---- Collective routes ---- */}
        <Route
          path="/collectives"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <DiscoverCollectivesPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/collectives/:slug"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <CollectiveDetailPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/collectives/:slug/manage"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <CollectiveManagePage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- Staff tasks route ---- */}
        <Route
          path="/tasks"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <TasksPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- Chat routes ---- */}
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ChatListPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/chat/channel/:channelId"
          element={
            <RequireAuth>
              <AppShell>
                <ChannelChatPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/chat/:collectiveId"
          element={
            <RequireAuth>
              <AppShell>
                <CollectiveChatPage />
              </AppShell>
            </RequireAuth>
          }
        />

        <Route
          path="/profile"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ProfilePage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <EditProfilePage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ViewProfilePage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/impact"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ImpactDashboardPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <LeaderboardPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/points"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <PointsPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/referral"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ReferralPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <NotificationsPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/announcements"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <AnnouncementsPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/announcements/create"
          element={
            <RequireAuth>
              <RequireRole minRole="national_staff">
                <AppShell>
                  <PageTransition>
                    <CreateAnnouncementPage />
                  </PageTransition>
                </AppShell>
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <SettingsPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- More hub ---- */}
        <Route
          path="/more"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <MorePage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- Membership ---- */}
        <Route
          path="/membership"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <MembershipPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- Donate routes ---- */}
        <Route
          path="/donate"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <DonatePage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/donate/thank-you"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <DonateThankYouPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/donate/donors"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <DonorWallPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- Shop routes ---- */}
        <Route
          path="/shop"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ShopPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/shop/cart"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <CartPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/shop/checkout"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <CheckoutPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/shop/order-confirmation"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <OrderConfirmationPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/shop/orders"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <OrdersPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/shop/orders/:orderId"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <OrderDetailPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/shop/:slug"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ProductDetailPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- Leader Dashboard ---- */}
        <Route
          path="/leader"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <LeaderDashboardPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- Reports (accessible to leaders + staff) ---- */}
        <Route
          path="/reports"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <ReportsPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- National Impact (public-facing) ---- */}
        <Route
          path="/impact/national"
          element={
            <RequireAuth>
              <AppShell>
                <PageTransition>
                  <NationalImpactPage />
                </PageTransition>
              </AppShell>
            </RequireAuth>
          }
        />

        {/* ---- Admin routes (staff+) ---- */}
        {/* Shared layout: AppShell + AdminLayout stay mounted across pages */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole minRole="national_staff">
                <AppShell>
                  <AdminLayoutRoute />
                </AppShell>
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="collectives" element={<AdminCollectivesPage />} />
          <Route path="collectives/:collectiveId" element={<AdminCollectiveDetailPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="workflows" element={<AdminWorkflowsPage />} />
          <Route path="events" element={<AdminEventsPage />} />
          <Route path="partners" element={<AdminPartnersPage />} />
          <Route path="challenges" element={<AdminChallengesPage />} />
          <Route path="surveys" element={<AdminSurveysPage />} />
          <Route path="surveys/create" element={<AdminCreateSurveyPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="national-impact" element={<NationalImpactPage />} />
          <Route path="moderation" element={<ModerationQueuePage />} />
          <Route path="email" element={<AdminEmailPage />} />
          <Route path="charity" element={<AdminCharityPage />} />
          <Route path="exports" element={<AdminExportsPage />} />
          <Route path="audit-log" element={<AdminAuditLogPage />} />
          <Route path="system" element={<AdminSystemPage />} />
          <Route path="membership" element={<AdminMembershipPage />} />
          <Route path="merch" element={<AdminMerchPage />} />
          <Route path="super" element={<RequireRole minRole="super_admin"><SuperAdminPage /></RequireRole>} />
          <Route path="dev-tools" element={<DevToolsPage />} />
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
