import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Bell, MessageSquare,
    Moon,
    Shield,
    Eye,
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
    ChevronRight, Volume2
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

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

/* ------------------------------------------------------------------ */
/*  Decorative background shapes                                       */
/* ------------------------------------------------------------------ */

function DecorativeShapes({ reduced }: { reduced: boolean }) {
  if (reduced) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Large ring - top right */}
      <motion.div
        className="absolute -top-20 -right-16 w-64 h-64 rounded-full border-[3px] border-primary-200/25"
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      />

      {/* Medium ring - left mid */}
      <motion.div
        className="absolute top-[40%] -left-24 w-48 h-48 rounded-full border-[2px] border-primary-200/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      />

      {/* Soft glow - top left */}
      <div
        className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-100/17 to-transparent"
      />

      {/* Soft glow - bottom right */}
      <div
        className="absolute -bottom-16 -right-8 w-56 h-56 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-100/13 to-transparent"
      />

      {/* Small floating dot cluster - top center */}
      <motion.div
        className="absolute top-16 left-1/2 w-3 h-3 rounded-full bg-primary-300/20"
        animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-24 left-[55%] w-2 h-2 rounded-full bg-primary-300/15"
        animate={{ y: [0, -8, 0], x: [0, -4, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute top-20 left-[45%] w-1.5 h-1.5 rounded-full bg-primary-300/20"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Small ring - bottom left */}
      <motion.div
        className="absolute bottom-32 -left-6 w-20 h-20 rounded-full border border-primary-200/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating dots - mid right */}
      <motion.div
        className="absolute top-[60%] right-8 w-2.5 h-2.5 rounded-full bg-primary-300/20"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute top-[65%] right-14 w-1.5 h-1.5 rounded-full bg-primary-200/25"
        animate={{ y: [0, -8, 0], x: [0, 3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
    </div>
  )
}

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
        'cursor-pointer hover:bg-surface-3 active:bg-surface-3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
        !hideDivider && '',
      )}
      aria-label={label}
    >
      <span
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mr-3',
          danger ? 'bg-error-100 text-error-600' : 'bg-primary-100/70 text-primary-500',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            'block text-sm font-medium truncate',
            danger ? 'text-error-600' : 'text-primary-800',
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
    { key: 'survey_request', label: 'Surveys', description: 'Post-event survey requests' },
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
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.65]}>
      <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">
        Chat Preferences
      </h2>
      <div className="space-y-1">
        <Toggle
          checked={prefs.chat_messages}
          onChange={(val) => onUpdate('chat_messages', val)}
          label="Chat Messages"
          description="All new messages in your collectives"
        />
        <Toggle
          checked={prefs.chat_mention}
          onChange={(val) => onUpdate('chat_mention', val)}
          label="@Mentions"
          description="When someone @mentions you in chat"
        />
        <Toggle
          checked={prefs.chat_reply}
          onChange={(val) => onUpdate('chat_reply', val)}
          label="Replies"
          description="When someone replies to your message"
        />
        <Toggle
          checked={prefs.chat_image}
          onChange={(val) => onUpdate('chat_image', val)}
          label="Photos"
          description="When someone shares a photo in chat"
        />
        <Toggle
          checked={prefs.chat_poll}
          onChange={(val) => onUpdate('chat_poll', val)}
          label="Polls"
          description="When a new poll is created in chat"
        />
        <Toggle
          checked={prefs.chat_announcement}
          onChange={(val) => onUpdate('chat_announcement', val)}
          label="Announcements"
          description="When a leader posts an announcement in chat"
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
        onChange={(val) => {
          onUpdate('quiet_hours_enabled', val)
          // Save the user's timezone so the server applies quiet hours correctly
          if (val) {
            onUpdate('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
          }
        }}
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
              className="w-full rounded-lg bg-surface-3 px-3 py-2 text-sm text-primary-800 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-primary-400 mb-1">End</label>
            <input
              type="time"
              value={prefs.quiet_hours_end}
              onChange={(e) => onUpdate('quiet_hours_end', e.target.value)}
              className="w-full rounded-lg bg-surface-3 px-3 py-2 text-sm text-primary-800 focus:ring-2 focus:ring-primary-500 outline-none"
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

  // Reset form state when sheet reopens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting form on open is intentional
      setNewPassword('')
      setConfirmPassword('')
      setError('')
    }
  }, [open])

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

  // Reset form state when sheet reopens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting form on open is intentional
      setNewEmail('')
      setError('')
    }
  }, [open])

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
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-primary-500 hover:bg-primary-100 transition-colors"
          >
            Website
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-primary-500 hover:bg-primary-100 transition-colors"
          >
            Instagram
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-primary-500 hover:bg-primary-100 transition-colors"
          >
            Facebook
          </a>
        </div>

        {/* Aboriginal Acknowledgment */}
        <div className="mt-6 rounded-xl bg-secondary-50/40 shadow-sm p-4 text-left">
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
        <div className="pt-2">
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
  const { toast } = useToast()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data, error } = await supabase.functions.invoke('data-export')
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
    <div className="space-y-3 py-6">
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

  // Notification preferences (local state, hydrated from profile, persisted to profile)
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [soundEnabled, setSoundEnabled] = useState(true)
  // Hydrate prefs from profile on mount / when profile loads
  type ProfileExt = { notification_preferences?: Partial<NotificationPreferences> & { sound_enabled?: boolean; profile_visible?: boolean }; marketing_opt_in?: boolean; deleted_at?: string; deletion_status?: string; deletion_requested_at?: string }
  const profileExt = profile as unknown as ProfileExt | null
  const savedPrefsJson = JSON.stringify(profileExt?.notification_preferences ?? null)
  const [profileVisible, setProfileVisible] = useState(true)
  const [marketingOptIn, setMarketingOptIn] = useState(true)
  useEffect(() => {
    const saved = profileExt?.notification_preferences
    if (saved) {
      setPrefs((prev) => ({
        ...prev,
        ...(saved as Partial<NotificationPreferences>),
      }))
      // Hydrate sound + visibility from notification_preferences JSON
      if (saved.sound_enabled !== undefined) setSoundEnabled(saved.sound_enabled)
      if (saved.profile_visible !== undefined) setProfileVisible(saved.profile_visible)
    }
    // Hydrate marketing opt-in from profile
    if (profileExt) setMarketingOptIn(profileExt.marketing_opt_in !== false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPrefsJson])

  const handleMarketingToggle = useCallback(
    (value: boolean) => {
      if (!user) return
      setMarketingOptIn(value)
      supabase
        .from('profiles')
        .update({ marketing_opt_in: value } as unknown as Record<string, unknown>)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save marketing opt-in:', error)
            setMarketingOptIn(!value) // revert on failure
          }
        })
    },
    [user],
  )

  /** Persist the full notification_preferences JSONB (includes sound_enabled + profile_visible) */
  const persistPrefs = useCallback(
    (updated: Record<string, unknown>, rollbackFn?: () => void) => {
      if (!user) return
      supabase
        .from('profiles')
        .update({
          notification_preferences: updated,
        } as unknown as Record<string, unknown>)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to save preferences:', error)
            rollbackFn?.()
          }
        })
    },
    [user],
  )

  const updatePref = useCallback(
    (key: keyof NotificationPreferences, value: boolean | string) => {
      setPrefs((prev) => {
        const updated = { ...prev, [key]: value }
        const rollback = prev
        persistPrefs(
          { ...updated, sound_enabled: soundEnabled, profile_visible: profileVisible },
          () => setPrefs(rollback),
        )
        return updated
      })
    },
    [persistPrefs, soundEnabled, profileVisible],
  )

  const handleSoundToggle = useCallback(
    (value: boolean) => {
      if (!user) return
      const prev = soundEnabled
      setSoundEnabled(value)
      persistPrefs(
        { ...prefs, sound_enabled: value, profile_visible: profileVisible },
        () => setSoundEnabled(prev),
      )
    },
    [user, prefs, profileVisible, soundEnabled, persistPrefs],
  )

  const handleVisibilityToggle = useCallback(
    (value: boolean) => {
      if (!user) return
      const prev = profileVisible
      setProfileVisible(value)
      persistPrefs(
        { ...prefs, sound_enabled: soundEnabled, profile_visible: value },
        () => setProfileVisible(prev),
      )
    },
    [user, prefs, soundEnabled, profileVisible, persistPrefs],
  )

  const handleLogout = async () => {
    await unregisterPush()
    await signOut()
    navigate('/welcome')
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    // Soft-delete: mark account for deletion (30-day grace)
    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_status: 'pending_deletion',
        deletion_requested_at: new Date().toISOString(),
      } as unknown as Record<string, unknown>)
      .eq('id', user.id)

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
      <Page noBackground stickyOverlay={<Header title="Settings" back transparent className="collapse-header" />}>
        <div style={{ paddingTop: '3.5rem' }}>
          <SettingsSkeleton />
        </div>
      </Page>
    )
  }

  return (
    <Page noBackground stickyOverlay={<Header title="Settings" back transparent className="collapse-header" />}>
      {/* Background + content container */}
      <div className="relative" style={{ paddingTop: '3.5rem' }}>
        {/* Gradient background */}
        <div className="absolute inset-0 -mx-4 lg:-mx-6 bg-gradient-to-b from-primary-50/30 via-white to-primary-50/10 -z-10" />

        {/* Animated decorative shapes */}
        <div className="absolute inset-0 -mx-4 lg:-mx-6 -z-10">
          <DecorativeShapes reduced={!!shouldReduceMotion} />
        </div>

        {/* Content */}
        <div className="relative">
          <motion.div
            className="pb-8"
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            animate="visible"
          >
            {/* ---- Notifications ---- */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="Notifications" className="pt-4" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-primary-100/50 overflow-hidden">
              <MenuRow
                icon={<Bell size={18} />}
                label="Notification Preferences"
                subtitle="Choose what you get notified about"
                onClick={() => setShowNotifPrefs(true)}
              />
              <MenuRow
                icon={<MessageSquare size={18} />}
                label="Chat Preferences"
                subtitle="Messages, replies, polls, announcements"
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
                    onChange={handleSoundToggle}
                    size="sm"
                  />
                }
                onClick={() => handleSoundToggle(!soundEnabled)}
                hideDivider
              />
            </div>

            </motion.div>

            {/* ---- Privacy ---- */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="Privacy" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-primary-100/50 overflow-hidden">
              <MenuRow
                icon={<Eye size={18} />}
                label="Profile Visibility"
                subtitle={profileVisible ? 'Public' : 'Only collective members'}
                rightContent={
                  <Toggle
                    checked={profileVisible}
                    onChange={handleVisibilityToggle}
                    size="sm"
                  />
                }
                onClick={() => handleVisibilityToggle(!profileVisible)}
              />
              <MenuRow
                icon={<Mail size={18} />}
                label="Marketing Emails"
                subtitle={marketingOptIn ? 'Subscribed' : 'Unsubscribed'}
                rightContent={
                  <Toggle
                    checked={marketingOptIn}
                    onChange={handleMarketingToggle}
                    size="sm"
                  />
                }
                onClick={() => handleMarketingToggle(!marketingOptIn)}
                hideDivider
              />
            </div>

            </motion.div>

            {/* ---- Account ---- */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="Account" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-primary-100/50 overflow-hidden">
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

            </motion.div>

            {/* ---- About ---- */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="About" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-primary-100/50 overflow-hidden">
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

            </motion.div>

            {/* ---- App Info ---- */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp} className="mt-6 text-center">
              <p className="text-xs text-primary-400">
                {APP_NAME} v{APP_VERSION}
              </p>
            </motion.div>

            {/* ---- Logout ---- */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp} className="mt-4">
              <Button
                variant="ghost"
                fullWidth
                icon={<LogOut size={18} />}
                onClick={() => setShowLogoutConfirm(true)}
                className="text-primary-800"
              >
                Log Out
              </Button>
            </motion.div>

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
        </div>
      </div>
    </Page>
  )
}
