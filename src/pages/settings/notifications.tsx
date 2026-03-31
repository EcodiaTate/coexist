import { useState, useCallback, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import { motion } from 'framer-motion'
import {
  Bell, MessageSquare, Moon, Volume2,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Toggle } from '@/components/toggle'
import { BottomSheet } from '@/components/bottom-sheet'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
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
      <h2 className="font-heading text-lg font-semibold text-neutral-900 mb-4">
        Quiet Hours / Do Not Disturb
      </h2>
      <Toggle
        checked={prefs.quiet_hours_enabled}
        onChange={(val) => {
          onUpdate('quiet_hours_enabled', val)
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
            <label className="block text-xs font-medium text-neutral-500 mb-1">Start</label>
            <input
              type="time"
              value={prefs.quiet_hours_start}
              onChange={(e) => onUpdate('quiet_hours_start', e.target.value)}
              className="w-full rounded-lg bg-surface-3 px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-neutral-500 mb-1">End</label>
            <input
              type="time"
              value={prefs.quiet_hours_end}
              onChange={(e) => onUpdate('quiet_hours_end', e.target.value)}
              className="w-full rounded-lg bg-surface-3 px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsNotificationsPage() {
  const { user, profile } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const [showQuietHours, setShowQuietHours] = useState(false)

  // Notification preferences
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [soundEnabled, setSoundEnabled] = useState(true)

  type ProfileExt = { notification_preferences?: Partial<NotificationPreferences> & { sound_enabled?: boolean; profile_visible?: boolean } }
  const profileExt = profile as unknown as ProfileExt | null
  const savedPrefsJson = JSON.stringify(profileExt?.notification_preferences ?? null)

  // Hydrate from profile
  const [profileVisible, setProfileVisible] = useState(true)
  useEffect(() => {
    const saved = profileExt?.notification_preferences
    if (saved) {
      setPrefs((prev) => ({ ...prev, ...(saved as Partial<NotificationPreferences>) }))
      if (saved.sound_enabled !== undefined) setSoundEnabled(saved.sound_enabled)
      if (saved.profile_visible !== undefined) setProfileVisible(saved.profile_visible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPrefsJson])

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

  const chatToggles: { key: keyof NotificationPreferences; label: string; description: string }[] = [
    { key: 'chat_messages', label: 'Chat Messages', description: 'All new messages in your collectives' },
    { key: 'chat_mention', label: '@Mentions', description: 'When someone @mentions you in chat' },
    { key: 'chat_reply', label: 'Replies', description: 'When someone replies to your message' },
    { key: 'chat_image', label: 'Photos', description: 'When someone shares a photo in chat' },
    { key: 'chat_poll', label: 'Polls', description: 'When a new poll is created in chat' },
    { key: 'chat_announcement', label: 'Announcements', description: 'When a leader posts an announcement in chat' },
  ]

  return (
    <Page noBackground stickyOverlay={<Header title="Notifications" back transparent className="collapse-header" />}>
      <div className="relative" style={{ paddingTop: '3.5rem' }}>
        <div className="absolute inset-0 -mx-4 lg:-mx-6 bg-gradient-to-b from-primary-50/30 via-white to-primary-50/10 -z-10" />

        <motion.div
          className="pb-8"
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ---- Notification Preferences ---- */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="Event & App Notifications" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-neutral-100 overflow-hidden p-4 space-y-1">
              {notifToggles.map(({ key, label, description }) => (
                <Toggle
                  key={key}
                  checked={prefs[key] as boolean}
                  onChange={(val) => updatePref(key, val)}
                  label={label}
                  description={description}
                  className="py-2.5"
                />
              ))}
            </div>
          </motion.div>

          {/* ---- Chat Preferences ---- */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="Chat Notifications" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-neutral-100 overflow-hidden p-4 space-y-1">
              {chatToggles.map(({ key, label, description }) => (
                <Toggle
                  key={key}
                  checked={prefs[key] as boolean}
                  onChange={(val) => updatePref(key, val)}
                  label={label}
                  description={description}
                  className="py-2.5"
                />
              ))}
            </div>
          </motion.div>

          {/* ---- Sound & Quiet Hours ---- */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader label="Sound & Schedule" />
            <div className="bg-white/90 rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
              <button
                type="button"
                onClick={() => handleSoundToggle(!soundEnabled)}
                className="flex items-center w-full min-h-[52px] px-4 py-3 text-left hover:bg-surface-3 active:bg-surface-3 cursor-pointer"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mr-3 bg-primary-100/70 text-primary-500">
                  <Volume2 size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-neutral-900">Notification Sounds</span>
                </span>
                <Toggle checked={soundEnabled} onChange={handleSoundToggle} size="sm" />
              </button>
              <button
                type="button"
                onClick={() => setShowQuietHours(true)}
                className="flex items-center w-full min-h-[52px] px-4 py-3 text-left hover:bg-surface-3 active:bg-surface-3 cursor-pointer"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mr-3 bg-primary-100/70 text-primary-500">
                  <Moon size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-neutral-900">Quiet Hours</span>
                  <span className="block text-xs text-neutral-500 mt-0.5">
                    {prefs.quiet_hours_enabled
                      ? `${prefs.quiet_hours_start} \u2013 ${prefs.quiet_hours_end}`
                      : 'Off'}
                  </span>
                </span>
                <span className="text-neutral-400">
                  <Bell size={16} />
                </span>
              </button>
            </div>
          </motion.div>

          <QuietHoursSheet
            open={showQuietHours}
            onClose={() => setShowQuietHours(false)}
            prefs={prefs}
            onUpdate={updatePref}
          />
        </motion.div>
      </div>
    </Page>
  )
}
