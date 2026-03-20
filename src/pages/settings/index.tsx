import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Bell,
  BellOff,
  MessageSquare,
  Moon,
  Shield,
  Eye,
  Trophy,
  Mail,
  Lock,
  AtSign,
  Trash2,
  Heart,
  FileText,
  ShieldCheck,
  HelpCircle,
  LifeBuoy,
  Cookie,
  Info,
  LogOut,
  ChevronRight,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Toggle } from '@/components/toggle'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { usePlatform } from '@/hooks/use-platform'
import { useToast } from '@/components/toast'
import {
  APP_NAME,
  TAGLINE,
  CONTACT_EMAIL,
  WEBSITE_URL,
  INSTAGRAM_URL,
  FACEBOOK_URL,
} from '@/lib/constants'
import type { NotificationPreferences } from '@/hooks/use-notifications'
import { DEFAULT_PREFERENCES } from '@/hooks/use-notifications'
import { usePush } from '@/hooks/use-push'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const APP_VERSION = '1.0.0'
const TOS_VERSION = '1.0'
const PRIVACY_VERSION = '1.0'

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ label, className }: { label: string; className?: string }) {
  return (
    <h3
      className={cn(
        'px-4 pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-primary-400',
        className,
      )}
    >
      {label}
    </h3>
  )
}

/* ------------------------------------------------------------------ */
/*  Menu row                                                           */
/* ------------------------------------------------------------------ */

interface MenuRowProps {
  icon: React.ReactNode
  label: string
  subtitle?: string
  onClick?: () => void
  rightContent?: React.ReactNode
  danger?: boolean
  hideDivider?: boolean
}

function MenuRow({
  icon,
  label,
  subtitle,
  onClick,
  rightContent,
  danger = false,
  hideDivider = false,
}: MenuRowProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'flex items-center w-full min-h-[52px] px-4 py-3 text-left',
        'transition-colors duration-100',
        'cursor-pointer hover:bg-primary-50 active:bg-primary-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
        !hideDivider && 'border-b border-primary-100',
      )}
      aria-label={label}
    >
      <span
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mr-3',
          danger ? 'bg-red-100 text-red-600' : 'bg-white text-primary-400',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            'block text-sm font-medium truncate',
            danger ? 'text-red-600' : 'text-primary-800',
          )}
        >
          {label}
        </span>
        {subtitle && (
          <span className="block text-xs text-primary-400 truncate mt-0.5">
            {subtitle}
          </span>
        )}
      </span>
      <span className="flex items-center shrink-0 ml-3 text-primary-400">
        {rightContent ?? <ChevronRight className="w-5 h-5" aria-hidden="true" />}
      </span>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Notification Preferences Sheet                                     */
/* ------------------------------------------------------------------ */

function NotificationPrefsSheet({
  open,
  onClose,
  prefs,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  prefs: NotificationPreferences
  onUpdate: (key: keyof NotificationPreferences, value: boolean | string) => void
}) {
  const notifToggles: { key: keyof NotificationPreferences; label: string; description: string }[] = [
    { key: 'event_reminder', label: 'Event Reminders', description: '24h before your registered events' },
    { key: 'registration_confirmed', label: 'Registration Confirmed', description: 'When you register for an event' },
    { key: 'event_cancelled', label: 'Event Cancelled', description: 'When an event is cancelled' },
    { key: 'event_updated', label: 'Event Updated', description: 'Changes to events you\u2019re registered for' },
    { key: 'new_event_in_collective', label: 'New Events', description: 'New events in your collectives' },
    { key: 'event_invite', label: 'Event Invites', description: 'When someone invites you to an event' },
    { key: 'waitlist_promotion', label: 'Waitlist Promotion', description: 'When you get off the waitlist' },
    { key: 'global_announcement', label: 'Announcements', description: 'National Co-Exist announcements' },
    { key: 'challenge_update', label: 'Challenges', description: 'Challenge progress and updates' },
    { key: 'points_earned', label: 'Points Earned', description: 'When you earn points' },
    { key: 'badge_unlocked', label: 'Badge Unlocked', description: 'When you unlock a new badge' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.85]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">
        Notification Preferences
      </h2>
      <div className="space-y-1">
        {notifToggles.map(({ key, label, description }) => (
          <Toggle
            key={key}
            checked={prefs[key] as boolean}
            onChange={(val) => onUpdate(key, val)}
            label={label}
            description={description}
            className="py-2.5"
          />
        ))}
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Chat Preferences Sheet                                             */
/* ------------------------------------------------------------------ */

function ChatPrefsSheet({
  open,
  onClose,
  prefs,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  prefs: NotificationPreferences
  onUpdate: (key: keyof NotificationPreferences, value: boolean) => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.4]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">
        Chat Preferences
      </h2>
      <div className="space-y-1">
        <Toggle
          checked={prefs.chat_messages}
          onChange={(val) => onUpdate('chat_messages', val)}
          label="Chat Messages"
          description="Notifications for new messages in collectives"
        />
        <Toggle
          checked={prefs.chat_mention}
          onChange={(val) => onUpdate('chat_mention', val)}
          label="@Mentions Only"
          description="Only get notified when someone @mentions you"
        />
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Quiet Hours Sheet                                                  */
/* ------------------------------------------------------------------ */

function QuietHoursSheet({
  open,
  onClose,
  prefs,
  onUpdate,
}: {
  open: boolean
  onClose: () => void
  prefs: NotificationPreferences
  onUpdate: (key: keyof NotificationPreferences, value: boolean | string) => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.45]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">
        Quiet Hours / Do Not Disturb
      </h2>
      <Toggle
        checked={prefs.quiet_hours_enabled}
        onChange={(val) => onUpdate('quiet_hours_enabled', val)}
        label="Enable Quiet Hours"
        description="Silence all notifications during set hours"
        className="mb-4"
      />
      {prefs.quiet_hours_enabled && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-primary-400 mb-1">Start</label>
            <input
              type="time"
              value={prefs.quiet_hours_start}
              onChange={(e) => onUpdate('quiet_hours_start', e.target.value)}
              className="w-full rounded-lg border border-primary-200 px-3 py-2 text-sm text-primary-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-primary-400 mb-1">End</label>
            <input
              type="time"
              value={prefs.quiet_hours_end}
              onChange={(e) => onUpdate('quiet_hours_end', e.target.value)}
              className="w-full rounded-lg border border-primary-200 px-3 py-2 text-sm text-primary-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Change Password Sheet                                              */
/* ------------------------------------------------------------------ */

function ChangePasswordSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { updatePassword } = useAuth()
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error: err } = await updatePassword(newPassword)
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.5]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">
        Change Password
      </h2>
      <div className="space-y-3">
        <Input
          type="password"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          error={error && !confirmPassword ? error : undefined}
        />
        <Input
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          error={error && confirmPassword ? error : undefined}
        />
        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onClick={handleSubmit}
        >
          Update Password
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Change Email Sheet                                                 */
/* ------------------------------------------------------------------ */

function ChangeEmailSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!newEmail.includes('@')) {
      setError('Please enter a valid email')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ email: newEmail })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      toast.success('Verification email sent to your new address')
      setNewEmail('')
      onClose()
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.4]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-2">
        Change Email
      </h2>
      <p className="text-sm text-primary-400 mb-4">
        Current: {user?.email}
      </p>
      <div className="space-y-3">
        <Input
          type="email"
          label="New Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          autoComplete="email"
          error={error || undefined}
        />
        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onClick={handleSubmit}
        >
          Send Verification
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  About Sheet                                                        */
/* ------------------------------------------------------------------ */

function AboutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.7]}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary-100 flex items-center justify-center">
          <Heart size={28} className="text-primary-400" />
        </div>
        <h2 className="font-heading text-xl font-bold text-primary-800">
          {APP_NAME}
        </h2>
        <p className="text-sm text-primary-400 font-medium mt-1">{TAGLINE}</p>
        <p className="mt-4 text-sm text-primary-400 leading-relaxed px-2">
          Co-Exist is a national youth-led environmental nonprofit that runs conservation
          events through local groups called Collectives. We believe in the power of young
          people to protect and restore Australia&apos;s natural environment.
        </p>
        <p className="mt-3 text-sm text-primary-400 leading-relaxed px-2">
          5,500+ volunteers &middot; 13 collectives &middot; 35,500+ native plants &middot;
          4,900+ kg litter removed
        </p>

        <div className="mt-5 flex justify-center gap-3">
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary-400 hover:bg-primary-100 transition-colors"
          >
            Website
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary-400 hover:bg-primary-100 transition-colors"
          >
            Instagram
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary-400 hover:bg-primary-100 transition-colors"
          >
            Facebook
          </a>
        </div>

        {/* Aboriginal Acknowledgment */}
        <div className="mt-6 rounded-xl bg-white border border-secondary-100 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-800 mb-1.5">
            Acknowledgment of Country
          </p>
          <p className="text-xs text-primary-800 leading-relaxed">
            Co-Exist acknowledges the Traditional Owners and Custodians of the land on which
            we live, work, and volunteer. We pay our respects to Elders past, present, and
            emerging, and recognise the deep connection Aboriginal and Torres Strait Islander
            peoples have to Country. Sovereignty was never ceded.
          </p>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Terms of Service Sheet                                             */
/* ------------------------------------------------------------------ */

function TermsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.85]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-1">
        Terms of Service
      </h2>
      <p className="text-xs text-primary-400 mb-4">Version {TOS_VERSION}</p>
      <div className="prose prose-sm text-primary-800 space-y-3 text-sm leading-relaxed">
        <p>
          Welcome to Co-Exist. By using our app, you agree to these terms. Co-Exist is a
          registered Australian charity (ACNC) providing a platform for youth conservation activities.
        </p>
        <h4 className="font-semibold text-primary-800 text-sm">1. Eligibility</h4>
        <p>You must be at least 18 years old to create an account. Users under 18 may attend events
          with parental/guardian consent through an approved Collective leader.</p>
        <h4 className="font-semibold text-primary-800 text-sm">2. Your Account</h4>
        <p>You are responsible for your account credentials and all activity under your account.
          Notify us immediately of any unauthorised use.</p>
        <h4 className="font-semibold text-primary-800 text-sm">3. Acceptable Use</h4>
        <p>You agree to use Co-Exist respectfully. Harassment, hate speech, spam, or sharing of
          inappropriate content will result in account suspension.</p>
        <h4 className="font-semibold text-primary-800 text-sm">4. Content</h4>
        <p>You retain ownership of content you post. By posting, you grant Co-Exist a non-exclusive
          licence to use it for promotional and operational purposes.</p>
        <h4 className="font-semibold text-primary-800 text-sm">5. Events & Safety</h4>
        <p>Co-Exist events involve outdoor conservation activities. Participants assume inherent risks
          and should follow all safety instructions from Collective leaders.</p>
        <h4 className="font-semibold text-primary-800 text-sm">6. Donations</h4>
        <p>Donations are processed via Stripe. Co-Exist is a registered charity. Tax-deductible status
          depends on current DGR registration.</p>
        <h4 className="font-semibold text-primary-800 text-sm">7. Termination</h4>
        <p>We may suspend or terminate accounts that violate these terms. You may delete your account
          at any time through Settings.</p>
        <p className="text-xs text-primary-400 mt-4">
          Last updated: March 2026. Contact: {CONTACT_EMAIL}
        </p>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Privacy Policy Sheet                                               */
/* ------------------------------------------------------------------ */

function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.85]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-1">
        Privacy Policy
      </h2>
      <p className="text-xs text-primary-400 mb-4">Version {PRIVACY_VERSION}</p>
      <div className="prose prose-sm text-primary-800 space-y-3 text-sm leading-relaxed">
        <p>
          Co-Exist Australia (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects and processes personal
          information in accordance with the Australian Privacy Act 1988 and GDPR where applicable.
        </p>
        <h4 className="font-semibold text-primary-800 text-sm">What We Collect</h4>
        <p>Name, email, location (optional), profile photo, event participation history, impact
          data, and device information for push notifications.</p>
        <h4 className="font-semibold text-primary-800 text-sm">How We Use It</h4>
        <p>To operate the app, facilitate events, track conservation impact, send notifications,
          process donations, and improve our services.</p>
        <h4 className="font-semibold text-primary-800 text-sm">Third Parties</h4>
        <p>We use Supabase (database), Stripe (payments), SendGrid (email), and Firebase Cloud
          Messaging (push notifications). We do not sell your data.</p>
        <h4 className="font-semibold text-primary-800 text-sm">Your Rights</h4>
        <p>You can access, correct, export, or delete your personal data at any time through the
          app settings. Deletion requests are processed within 30 days.</p>
        <h4 className="font-semibold text-primary-800 text-sm">Data Retention</h4>
        <p>Account data is retained while your account is active. After deletion, data enters a
          30-day grace period before permanent removal. Anonymised impact data is retained for
          charity reporting.</p>
        <h4 className="font-semibold text-primary-800 text-sm">Children</h4>
        <p>Co-Exist does not knowingly collect information from children under 13. If we become
          aware of data collected from a child under 13, we will delete it promptly.</p>
        <p className="text-xs text-primary-400 mt-4">
          Contact our privacy team: {CONTACT_EMAIL}
        </p>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Help / FAQ Sheet                                                   */
/* ------------------------------------------------------------------ */

function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const faqs = [
    { q: 'How do I join a Collective?', a: 'Go to the Explore tab, find a Collective near you, and tap "Join". Leaders will approve your request.' },
    { q: 'How does check-in work?', a: 'At events, the leader will show a QR code. Tap the check-in button on the event page and scan it to earn your points.' },
    { q: 'How are badges earned?', a: 'Badges are automatically awarded when you meet criteria like attending a certain number of events or planting trees.' },
    { q: 'Can I cancel an event registration?', a: 'Yes! Go to the event page and tap "Cancel Registration" before the event starts.' },
    { q: 'How do I become a Collective leader?', a: 'Contact Co-Exist national team via the app or email. Leaders are selected based on commitment and location.' },
    { q: 'Is my donation tax-deductible?', a: 'This depends on current DGR status. Check with Co-Exist or your tax advisor.' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.85]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">
        Help & FAQ
      </h2>
      <div className="space-y-4">
        {faqs.map(({ q, a }) => (
          <div key={q}>
            <h4 className="text-sm font-semibold text-primary-800">{q}</h4>
            <p className="text-sm text-primary-400 mt-1 leading-relaxed">{a}</p>
          </div>
        ))}
        <div className="pt-2 border-t border-primary-100">
          <p className="text-sm text-primary-400">
            Still need help?{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary-400 font-medium hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  GDPR Data Export / Deletion Sheet                                  */
/* ------------------------------------------------------------------ */

function DataPrivacySheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data, error } = await supabase.functions.invoke('data-export', {
        body: { userId: user?.id },
      })
      if (error) throw error

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coexist-data-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Your data has been downloaded.')
    } catch {
      toast.error('Export request failed. Please try again.')
    }
    setExporting(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.45]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-2">
        Your Data & Privacy
      </h2>
      <p className="text-sm text-primary-400 mb-4 leading-relaxed">
        Under GDPR and the Australian Privacy Act, you have the right to access, export,
        and delete your personal data.
      </p>
      <div className="space-y-2">
        <Button
          variant="secondary"
          fullWidth
          loading={exporting}
          onClick={handleExport}
        >
          Request Data Export
        </Button>
        <p className="text-xs text-primary-400 text-center">
          Your data will be emailed to you as a JSON file within 48 hours.
        </p>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Settings Skeleton                                                  */
/* ------------------------------------------------------------------ */

function SettingsSkeleton() {
  return (
    <div className="space-y-3 px-4 py-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="text" className="h-13 rounded-lg" />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Settings Page                                                 */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { isWeb } = usePlatform()
  const { toast } = useToast()
  const { unregister: unregisterPush } = usePush()
  const shouldReduceMotion = useReducedMotion()

  // Sheet states
  const [showNotifPrefs, setShowNotifPrefs] = useState(false)
  const [showChatPrefs, setShowChatPrefs] = useState(false)
  const [showQuietHours, setShowQuietHours] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showDataPrivacy, setShowDataPrivacy] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Notification preferences (local state, persisted to profile)
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true)
  const [profileVisible, setProfileVisible] = useState(true)
  const [marketingOptIn, setMarketingOptIn] = useState(true)

  const updatePref = useCallback(
    (key: keyof NotificationPreferences, value: boolean | string) => {
      setPrefs((prev) => ({ ...prev, [key]: value }))
      // Persist to Supabase
      supabase
        .from('profiles')
        .update({
          notification_preferences: { ...prefs, [key]: value },
        } as any)
        .eq('id', user?.id ?? '')
        .then(({ error }) => {
          if (error) console.error('Failed to save preferences:', error)
        })
    },
    [prefs, user?.id],
  )

  const handleLogout = async () => {
    await unregisterPush()
    await signOut()
    navigate('/welcome')
  }

  const handleDeleteAccount = async () => {
    // Soft-delete: mark account for deletion (30-day grace)
    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_status: 'pending_deletion',
        deletion_requested_at: new Date().toISOString(),
      } as any)
      .eq('id', user?.id ?? '')

    if (error) {
      toast.error('Failed to delete account. Please contact support.')
      return
    }
    toast.info('Account marked for deletion. You have 30 days to recover it.')
    await unregisterPush()
    await signOut()
    navigate('/welcome')
  }

  if (!user || !profile) {
    return (
      <Page header={<Header title="Settings" back />}>
        <SettingsSkeleton />
      </Page>
    )
  }

  return (
    <Page header={<Header title="Settings" back />}>
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pb-8"
      >
        {/* ---- Notifications ---- */}
        <SectionHeader label="Notifications" className="pt-4" />
        <div className="bg-white">
          <MenuRow
            icon={<Bell size={18} />}
            label="Notification Preferences"
            subtitle="Choose what you get notified about"
            onClick={() => setShowNotifPrefs(true)}
          />
          <MenuRow
            icon={<MessageSquare size={18} />}
            label="Chat Preferences"
            subtitle="Mute collectives, @mention-only mode"
            onClick={() => setShowChatPrefs(true)}
          />
          <MenuRow
            icon={<Moon size={18} />}
            label="Quiet Hours"
            subtitle={
              prefs.quiet_hours_enabled
                ? `${prefs.quiet_hours_start} \u2013 ${prefs.quiet_hours_end}`
                : 'Off'
            }
            onClick={() => setShowQuietHours(true)}
          />
          <MenuRow
            icon={<Volume2 size={18} />}
            label="Notification Sounds"
            rightContent={
              <Toggle
                checked={soundEnabled}
                onChange={setSoundEnabled}
                size="sm"
              />
            }
            onClick={() => setSoundEnabled(!soundEnabled)}
            hideDivider
          />
        </div>

        {/* ---- Privacy ---- */}
        <SectionHeader label="Privacy" />
        <div className="bg-white">
          <MenuRow
            icon={<Eye size={18} />}
            label="Profile Visibility"
            subtitle={profileVisible ? 'Public' : 'Only collective members'}
            rightContent={
              <Toggle
                checked={profileVisible}
                onChange={setProfileVisible}
                size="sm"
              />
            }
            onClick={() => setProfileVisible(!profileVisible)}
          />
          <MenuRow
            icon={<Trophy size={18} />}
            label="Leaderboard"
            subtitle={leaderboardOptIn ? 'Visible on leaderboard' : 'Hidden from leaderboard'}
            rightContent={
              <Toggle
                checked={leaderboardOptIn}
                onChange={setLeaderboardOptIn}
                size="sm"
              />
            }
            onClick={() => setLeaderboardOptIn(!leaderboardOptIn)}
          />
          <MenuRow
            icon={<Mail size={18} />}
            label="Marketing Emails"
            subtitle={marketingOptIn ? 'Subscribed' : 'Unsubscribed'}
            rightContent={
              <Toggle
                checked={marketingOptIn}
                onChange={setMarketingOptIn}
                size="sm"
              />
            }
            onClick={() => setMarketingOptIn(!marketingOptIn)}
            hideDivider
          />
        </div>

        {/* ---- Account ---- */}
        <SectionHeader label="Account" />
        <div className="bg-white">
          <MenuRow
            icon={<Lock size={18} />}
            label="Change Password"
            onClick={() => setShowChangePassword(true)}
          />
          <MenuRow
            icon={<AtSign size={18} />}
            label="Change Email"
            subtitle={user.email}
            onClick={() => setShowChangeEmail(true)}
          />
          <MenuRow
            icon={<Shield size={18} />}
            label="Your Data & Privacy"
            subtitle="Export or delete your data (GDPR)"
            onClick={() => setShowDataPrivacy(true)}
          />
          <MenuRow
            icon={<Trash2 size={18} />}
            label="Delete Account"
            danger
            onClick={() => setShowDeleteConfirm(true)}
            hideDivider
          />
        </div>

        {/* ---- About ---- */}
        <SectionHeader label="About" />
        <div className="bg-white">
          <MenuRow
            icon={<Heart size={18} />}
            label="About Co-Exist"
            subtitle="Our mission and story"
            onClick={() => setShowAbout(true)}
          />
          <MenuRow
            icon={<FileText size={18} />}
            label="Terms of Service"
            subtitle={`Version ${TOS_VERSION}`}
            onClick={() => setShowTerms(true)}
          />
          <MenuRow
            icon={<ShieldCheck size={18} />}
            label="Privacy Policy"
            subtitle={`Version ${PRIVACY_VERSION}`}
            onClick={() => setShowPrivacy(true)}
          />
          <MenuRow
            icon={<Info size={18} />}
            label="Child Safety Policy"
            subtitle="Our commitment to child safety"
            onClick={() => {
              toast.info('Co-Exist is committed to child safety. Users must be 18+ to create accounts. Under-18 attendance requires guardian consent via Collective leaders.')
            }}
          />
          {isWeb && (
            <MenuRow
              icon={<Cookie size={18} />}
              label="Cookie Preferences"
              subtitle="Manage cookie consent"
              onClick={() => {
                // Dispatch event for cookie consent banner to reopen
                window.dispatchEvent(new CustomEvent('coexist:open-cookie-consent'))
              }}
            />
          )}
          <MenuRow
            icon={<HelpCircle size={18} />}
            label="Help & FAQ"
            onClick={() => setShowHelp(true)}
          />
          <MenuRow
            icon={<LifeBuoy size={18} />}
            label="Contact Support"
            subtitle={CONTACT_EMAIL}
            onClick={() => {
              window.open(`mailto:${CONTACT_EMAIL}`, '_blank')
            }}
            hideDivider
          />
        </div>

        {/* ---- App Info ---- */}
        <div className="mt-6 px-4 text-center">
          <p className="text-xs text-primary-400">
            {APP_NAME} v{APP_VERSION}
          </p>
        </div>

        {/* ---- Logout ---- */}
        <div className="mt-4 px-4">
          <Button
            variant="ghost"
            fullWidth
            icon={<LogOut size={18} />}
            onClick={() => setShowLogoutConfirm(true)}
            className="text-primary-800"
          >
            Log Out
          </Button>
        </div>

        {/* ---- All Bottom Sheets ---- */}
        <NotificationPrefsSheet
          open={showNotifPrefs}
          onClose={() => setShowNotifPrefs(false)}
          prefs={prefs}
          onUpdate={updatePref}
        />
        <ChatPrefsSheet
          open={showChatPrefs}
          onClose={() => setShowChatPrefs(false)}
          prefs={prefs}
          onUpdate={updatePref}
        />
        <QuietHoursSheet
          open={showQuietHours}
          onClose={() => setShowQuietHours(false)}
          prefs={prefs}
          onUpdate={updatePref}
        />
        <ChangePasswordSheet
          open={showChangePassword}
          onClose={() => setShowChangePassword(false)}
        />
        <ChangeEmailSheet
          open={showChangeEmail}
          onClose={() => setShowChangeEmail(false)}
        />
        <AboutSheet
          open={showAbout}
          onClose={() => setShowAbout(false)}
        />
        <TermsSheet
          open={showTerms}
          onClose={() => setShowTerms(false)}
        />
        <PrivacySheet
          open={showPrivacy}
          onClose={() => setShowPrivacy(false)}
        />
        <HelpSheet
          open={showHelp}
          onClose={() => setShowHelp(false)}
        />
        <DataPrivacySheet
          open={showDataPrivacy}
          onClose={() => setShowDataPrivacy(false)}
        />

        {/* Delete Account Confirmation */}
        <ConfirmationSheet
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account?"
          description="Your account will be marked for deletion. You have 30 days to recover it by logging back in. After that, all data will be permanently removed."
          confirmLabel="Delete My Account"
          variant="danger"
        />

        {/* Logout Confirmation */}
        <ConfirmationSheet
          open={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          title="Log Out?"
          description="You'll need to sign in again to access your account."
          confirmLabel="Log Out"
          variant="warning"
        />
      </motion.div>
    </Page>
  )
}
