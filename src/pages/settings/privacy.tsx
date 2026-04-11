import { useState, useCallback, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import { motion } from 'framer-motion'
import { Eye, Mail, ShieldOff } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Toggle } from '@/components/toggle'
import { BottomSheet } from '@/components/bottom-sheet'
import { Skeleton } from '@/components/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/toast'
import { supabase } from '@/lib/supabase'
import { useBlockedUsers, useUnblockUser } from '@/hooks/use-user-blocks'
import type { NotificationPreferences } from '@/hooks/use-notifications'
import { DEFAULT_PREFERENCES } from '@/hooks/use-notifications'
import { adminStagger as stagger, fadeUp } from '@/lib/admin-motion'


/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="px-1 pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 first:pt-2">
      {label}
    </h3>
  )
}

/* ------------------------------------------------------------------ */
/*  Menu row                                                           */
/* ------------------------------------------------------------------ */

function MenuRow({
  icon,
  label,
  subtitle,
  onClick,
  rightContent,
}: {
  icon: React.ReactNode
  label: string
  subtitle?: string
  onClick?: () => void
  rightContent?: React.ReactNode
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="flex items-center w-full min-h-[52px] px-4 py-3 text-left transition-colors duration-100 cursor-pointer hover:bg-surface-3 active:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
      aria-label={label}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mr-3 bg-primary-100/70 text-primary-500" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-neutral-900 truncate">{label}</span>
        {subtitle && <span className="block text-xs text-neutral-500 truncate mt-0.5">{subtitle}</span>}
      </span>
      <span className="flex items-center shrink-0 ml-3 text-neutral-400">
        {rightContent}
      </span>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Blocked Users Sheet                                                */
/* ------------------------------------------------------------------ */

function BlockedUsersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: blockedUsers, isLoading } = useBlockedUsers()
  const unblock = useUnblockUser()
  const { toast } = useToast()

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.55]}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-error-100 text-error-600">
          <ShieldOff size={16} />
        </div>
        <h2 className="font-heading text-lg font-semibold text-neutral-900">
          Blocked Users
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton variant="text" className="h-12 rounded-lg" />
          <Skeleton variant="text" className="h-12 rounded-lg" />
        </div>
      ) : !blockedUsers || blockedUsers.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-6">
          You haven&apos;t blocked anyone
        </p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {blockedUsers.map((block) => (
            <div key={block.blocked_id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-50">
              <span className="text-sm text-neutral-700 truncate flex-1">{block.blocked_id}</span>
              <button
                type="button"
                onClick={() => {
                  unblock.mutate(block.blocked_id, {
                    onSuccess: () => toast.success('User unblocked'),
                    onError: () => toast.error('Failed to unblock'),
                  })
                }}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-700 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer select-none"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsPrivacyPage() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const shouldReduceMotion = useReducedMotion()

  const [showBlockedUsers, setShowBlockedUsers] = useState(false)

  // Privacy state
  type ProfileExt = { notification_preferences?: Partial<NotificationPreferences> & { sound_enabled?: boolean; profile_visible?: boolean }; marketing_opt_in?: boolean }
  const profileExt = profile as unknown as ProfileExt | null

  const [profileVisible, setProfileVisible] = useState(() => {
    const saved = profileExt?.notification_preferences
    return saved?.profile_visible !== undefined ? saved.profile_visible : true
  })
  const [marketingOptIn, setMarketingOptIn] = useState(() =>
    profileExt ? profileExt.marketing_opt_in !== false : true
  )
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = profileExt?.notification_preferences
    return saved?.sound_enabled !== undefined ? saved.sound_enabled : true
  })
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    ...(profileExt?.notification_preferences as Partial<NotificationPreferences> | undefined),
  }))
  const [hydrated, setHydrated] = useState(!!profileExt)

  useEffect(() => {
    // Only seed from profile once - after the first load where profile arrives
    if (!profileExt || hydrated) return
    const saved = profileExt.notification_preferences
    if (saved) {
      setPrefs((prev) => ({ ...prev, ...(saved as Partial<NotificationPreferences>) }))
      if (saved.sound_enabled !== undefined) setSoundEnabled(saved.sound_enabled)
      if (saved.profile_visible !== undefined) setProfileVisible(saved.profile_visible)
    }
    setMarketingOptIn(profileExt.marketing_opt_in !== false)
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileExt])

  const persistPrefs = useCallback(
    (updated: Record<string, unknown>, rollbackFn?: () => void) => {
      if (!user) return
      supabase
        .from('profiles')
        .update({ notification_preferences: updated } as unknown as Record<string, unknown>)
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
            setMarketingOptIn(!value)
          }
        })
    },
    [user],
  )

  return (
    <Page noBackground stickyOverlay={<Header title="Privacy" back transparent className="collapse-header" />}>
      <div className="relative" style={{ paddingTop: '3.5rem' }}>
        <div className="absolute inset-0 -mx-4 lg:-mx-6 bg-gradient-to-b from-primary-50/30 via-white to-primary-50/10 -z-10" />

        <motion.div
          className="pb-8"
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ---- Visibility ---- */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="Visibility" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
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
              />
            </div>
          </motion.div>

          {/* ---- Blocked Users ---- */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="Blocked Users" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
              <MenuRow
                icon={<ShieldOff size={18} />}
                label="Blocked Users"
                subtitle="Manage blocked accounts"
                onClick={() => setShowBlockedUsers(true)}
              />
            </div>
          </motion.div>

          <BlockedUsersSheet
            open={showBlockedUsers}
            onClose={() => setShowBlockedUsers(false)}
          />
        </motion.div>
      </div>
    </Page>
  )
}
