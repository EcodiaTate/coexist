import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
    MapPin,
    Instagram,
    Calendar,
    Clock,
    TreePine,
    Trash2,
    Sprout,
    Bird,
    Ruler,
    Phone,
    Mail,
    AlertTriangle,
    Pencil,
    Settings,
    User,
    Heart,
    Shield,
    ChevronRight,
    Accessibility,
    Leaf,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Chip } from '@/components/chip'
import { Card } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { useAuth } from '@/hooks/use-auth'
import { useProfile, useProfileCollectives, useProfileStats } from '@/hooks/use-profile'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useCountUp } from '@/components/stat-card'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/* ------------------------------------------------------------------ */
/*  Colourful stat pill                                                */
/* ------------------------------------------------------------------ */

const statColours = [
  { bg: 'bg-primary-600', icon: 'text-primary-200', val: 'text-white', label: 'text-primary-200' },
  { bg: 'bg-moss-600', icon: 'text-moss-200', val: 'text-white', label: 'text-moss-200' },
  { bg: 'bg-sprout-600', icon: 'text-sprout-200', val: 'text-white', label: 'text-sprout-200' },
  { bg: 'bg-sky-600', icon: 'text-sky-200', val: 'text-white', label: 'text-sky-200' },
  { bg: 'bg-bark-600', icon: 'text-bark-200', val: 'text-white', label: 'text-bark-200' },
  { bg: 'bg-plum-600', icon: 'text-plum-200', val: 'text-white', label: 'text-plum-200' },
  { bg: 'bg-coral-600', icon: 'text-coral-200', val: 'text-white', label: 'text-coral-200' },
  { bg: 'bg-moss-700', icon: 'text-moss-200', val: 'text-white', label: 'text-moss-200' },
]

function ColouredStat({ value, label, icon, index }: { value: number; label: string; icon: React.ReactNode; index: number }) {
  const shouldReduceMotion = useReducedMotion()
  const c = statColours[index % statColours.length]
  const display = useCountUp(value, 1200, !shouldReduceMotion)

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
      className={`rounded-2xl ${c.bg} p-3.5 shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`font-heading text-2xl font-bold tabular-nums ${c.val}`}>
            {display.toLocaleString()}
          </p>
          <p className={`text-xs font-medium mt-0.5 ${c.label}`}>{label}</p>
        </div>
        <span className={`${c.icon} opacity-80`}>{icon}</span>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail row                                                         */
/* ------------------------------------------------------------------ */

const detailTints = {
  primary: { iconBg: 'bg-primary-500', iconText: 'text-white', stripe: 'border-l-primary-500' },
  sky:     { iconBg: 'bg-sky-500', iconText: 'text-white', stripe: 'border-l-sky-500' },
  moss:    { iconBg: 'bg-moss-500', iconText: 'text-white', stripe: 'border-l-moss-500' },
  sprout:  { iconBg: 'bg-sprout-500', iconText: 'text-white', stripe: 'border-l-sprout-500' },
  plum:    { iconBg: 'bg-plum-500', iconText: 'text-white', stripe: 'border-l-plum-500' },
}

function DetailRow({ icon, label, value, tint = 'primary' }: { icon: React.ReactNode; label: string; value: string; tint?: keyof typeof detailTints }) {
  const t = detailTints[tint]
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-l-4 ${t.stripe}`}>
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${t.iconBg} ${t.iconText}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-400">{label}</p>
        <p className="text-sm font-medium text-primary-800 truncate">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                    */
/* ------------------------------------------------------------------ */

function SectionHeading({ icon, iconBg, title, action }: { icon?: React.ReactNode; iconBg?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg ?? 'bg-primary-500'} text-white`}>
            {icon}
          </div>
        )}
        <h3 className="font-heading text-base font-bold text-primary-800">{title}</h3>
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function ProfileSkeleton() {
  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col items-center gap-3">
        <Skeleton variant="avatar" className="h-24 w-24" />
        <Skeleton variant="title" className="w-40" />
        <Skeleton variant="text" className="w-24" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
      </div>
      <Skeleton variant="card" />
      <Skeleton variant="text" count={3} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: collectives, isLoading: collectivesLoading } = useProfileCollectives()
  const { data: stats, isLoading: statsLoading } = useProfileStats()

  const isLoading = profileLoading || collectivesLoading || statsLoading
  const showLoading = useDelayedLoading(isLoading)

  if (showLoading) {
    return (
      <Page noBackground className="bg-surface-2">
        <ProfileSkeleton />
      </Page>
    )
  }
  if (!profile) {
    return (
      <Page noBackground className="bg-surface-2">
        <EmptyState
          illustration="error"
          title="Profile not found"
          description="We couldn't load your profile. Try again later."
          action={{ label: 'Go Home', to: '/' }}
        />
      </Page>
    )
  }

  const memberSince = new Date(profile.created_at ?? Date.now()).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })

  const hasDetails = profile.first_name || profile.email || profile.phone || profile.age || profile.postcode || profile.gender

  // Build stats array for rendering
  const allStats = [
    { value: stats?.eventsAttended ?? 0, label: 'Events', icon: <Calendar size={18} />, show: true },
    { value: stats?.hoursVolunteered ?? 0, label: 'Hours', icon: <Clock size={18} />, show: true },
    { value: stats?.treesPlanted ?? 0, label: 'Trees', icon: <TreePine size={18} />, show: true },
    { value: stats?.rubbishCollectedKg ?? 0, label: 'kg Rubbish', icon: <Trash2 size={18} />, show: (stats?.rubbishCollectedKg ?? 0) > 0 },
    { value: stats?.areaRestoredSqm ?? 0, label: 'Area (sqm)', icon: <Ruler size={18} />, show: (stats?.areaRestoredSqm ?? 0) > 0 },
    { value: stats?.nativePlants ?? 0, label: 'Native Plants', icon: <Sprout size={18} />, show: (stats?.nativePlants ?? 0) > 0 },
    { value: stats?.wildlifeSightings ?? 0, label: 'Wildlife', icon: <Bird size={18} />, show: (stats?.wildlifeSightings ?? 0) > 0 },
  ].filter(s => s.show)

  return (
    <Page noBackground className="bg-surface-2">
      {/* Hero banner */}
      <div className="-mx-4 lg:-mx-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-moss-600 pb-20 pt-8">
          {/* Decorative shapes - bolder */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-moss-400/15" />
            <div className="absolute top-6 -left-12 w-40 h-40 rounded-full bg-sprout-400/10" />
            <div className="absolute -bottom-16 right-8 w-48 h-48 rounded-full bg-sky-400/10" />
            <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full border-2 border-white/10" />
            <div className="absolute top-4 right-[20%] w-3 h-3 rounded-full bg-sprout-300/30" />
            <div className="absolute bottom-10 left-[15%] w-2 h-2 rounded-full bg-moss-300/25" />
            <div className="absolute top-[40%] right-4 w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>

          {/* Settings button */}
          <div className="relative z-10 flex justify-end px-4">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-white/15 text-white/90 hover:bg-white/25 active:scale-[0.93] transition-[colors,transform] duration-150"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Profile identity */}
          <motion.div
            className="relative z-10 flex flex-col items-center mt-2"
            variants={rm ? undefined : fadeUp}
            initial="hidden"
            animate="visible"
          >
            <div className="rounded-full p-1 bg-gradient-to-br from-sprout-300/50 to-moss-300/50 shadow-xl">
              <div className="rounded-full ring-3 ring-white/40">
                <Avatar
                  src={profile.avatar_url}
                  name={profile.display_name ?? ''}
                  size="xl"
                />
              </div>
            </div>

            <h2 className="mt-3 font-heading text-xl font-bold text-white drop-shadow-sm">
              {profile.display_name}
            </h2>
            {profile.pronouns && (
              <span className="mt-0.5 text-sm text-sprout-200">{profile.pronouns}</span>
            )}

            {/* Location + Instagram */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              {profile.location && (
                <span className="flex items-center gap-1 text-sm text-white/70">
                  <MapPin size={13} />
                  {profile.location}
                </span>
              )}
              {profile.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors"
                >
                  <Instagram size={13} />
                  {profile.instagram_handle.startsWith('@')
                    ? profile.instagram_handle
                    : `@${profile.instagram_handle}`}
                </a>
              )}
            </div>

            <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs text-white/80">
              <Leaf size={12} className="text-sprout-300" />
              Member since {memberSince}
            </span>
          </motion.div>
        </div>

        {/* Overlapping action buttons */}
        <div className="relative z-20 -mt-5 flex justify-center gap-3 px-4">
          <Button
            variant="primary"
            size="sm"
            icon={<Pencil size={15} />}
            onClick={() => navigate('/profile/edit')}
            className="shadow-lg bg-white !text-primary-700 hover:!bg-primary-50 border border-primary-200"
          >
            Edit Profile
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Settings size={15} />}
            onClick={() => navigate('/settings')}
            className="shadow-lg bg-primary-700 !text-white hover:!bg-primary-800 border-0"
          >
            Settings
          </Button>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <motion.div
          variants={rm ? undefined : fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 mx-auto max-w-sm"
        >
          <div className="rounded-2xl bg-gradient-to-br from-primary-100 to-moss-100 border border-primary-200/60 px-5 py-4 text-center shadow-sm">
            <p className="text-sm text-primary-700 leading-relaxed italic">
              &ldquo;{profile.bio}&rdquo;
            </p>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        className="pb-8 mt-6"
        variants={rm ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >

        {/* Colourful Stats */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-3 gap-2.5"
        >
          {allStats.map((s, i) => (
            <ColouredStat key={s.label} value={s.value} label={s.label} icon={s.icon} index={i} />
          ))}
        </motion.div>

        {/* Personal Details */}
        <motion.section variants={fadeUp} className="mt-6">
          <SectionHeading
            icon={<User size={14} />}
            iconBg="bg-primary-600"
            title="Your Details"
            action={
              <button
                onClick={() => navigate('/profile/edit')}
                className="flex items-center gap-1 text-xs font-bold text-primary-600 bg-primary-100 hover:bg-primary-200 px-3 min-h-9 rounded-full active:scale-[0.95] transition-[colors,transform] duration-150 cursor-pointer"
              >
                Edit <ChevronRight size={13} />
              </button>
            }
          />
          <div className="rounded-2xl bg-white shadow-md border border-primary-100 overflow-hidden">
            {hasDetails ? (
              <>
                {(profile.first_name || profile.last_name) && (
                  <DetailRow icon={<User size={14} />} label="Name" value={[profile.first_name, profile.last_name].filter(Boolean).join(' ')} tint="primary" />
                )}
                {profile.email && (
                  <DetailRow icon={<Mail size={14} />} label="Email" value={profile.email} tint="sky" />
                )}
                {profile.phone && (
                  <DetailRow icon={<Phone size={14} />} label="Phone" value={profile.phone} tint="moss" />
                )}
                {(profile.age || profile.gender) && (
                  <DetailRow
                    icon={<Calendar size={14} />}
                    label="Age / Gender"
                    value={[profile.age && `Age ${profile.age}`, profile.gender].filter(Boolean).join(' · ')}
                    tint="sprout"
                  />
                )}
                {profile.postcode && (
                  <DetailRow icon={<MapPin size={14} />} label="Postcode" value={profile.postcode} tint="plum" />
                )}
                {profile.accessibility_requirements && (
                  <DetailRow icon={<Accessibility size={14} />} label="Accessibility" value={profile.accessibility_requirements} tint="moss" />
                )}
              </>
            ) : (
              <div className="px-4 py-6 text-center bg-gradient-to-br from-primary-50 to-moss-50">
                <div className="w-12 h-12 rounded-full bg-primary-200 flex items-center justify-center mx-auto mb-3">
                  <User size={20} className="text-primary-600" />
                </div>
                <p className="text-sm text-primary-700 font-semibold">No details added yet</p>
                <p className="text-xs text-primary-500 mt-0.5">Help event leaders know who you are</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/profile/edit')}
                >
                  Add Your Details
                </Button>
              </div>
            )}
          </div>
        </motion.section>

        {/* Emergency Contact */}
        <motion.section variants={fadeUp} className="mt-5">
          <SectionHeading
            icon={<Shield size={14} />}
            iconBg="bg-warning-600"
            title="Emergency Contact"
            action={
              profile.emergency_contact_name ? (
                <button
                  onClick={() => navigate('/profile/edit')}
                  className="flex items-center gap-1 text-xs font-bold text-warning-700 bg-warning-100 hover:bg-warning-200 px-3 min-h-9 rounded-full active:scale-[0.95] transition-[colors,transform] duration-150 cursor-pointer"
                >
                  Edit <ChevronRight size={13} />
                </button>
              ) : undefined
            }
          />
          <div className="rounded-2xl overflow-hidden shadow-md">
            {profile.emergency_contact_name ? (
              <div className="bg-gradient-to-r from-warning-100 via-warning-50 to-white p-4 border border-warning-200">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-warning-500 flex items-center justify-center shadow-sm">
                    <Heart size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary-800">
                      {profile.emergency_contact_name}
                    </p>
                    {profile.emergency_contact_relationship && (
                      <p className="text-xs text-warning-700 font-medium">{profile.emergency_contact_relationship}</p>
                    )}
                    {profile.emergency_contact_phone && (
                      <p className="text-sm text-primary-700 flex items-center gap-1.5 mt-1 font-medium">
                        <Phone size={13} className="text-warning-600" />
                        {profile.emergency_contact_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-warning-200 via-warning-100 to-warning-50 p-5 text-center border border-warning-200">
                <div className="w-12 h-12 rounded-full bg-warning-500 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <AlertTriangle size={20} className="text-white" />
                </div>
                <p className="text-sm font-bold text-warning-800">No emergency contact set</p>
                <p className="text-xs text-warning-700 mt-0.5">Event leaders need this for your safety</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/profile/edit')}
                >
                  Add Emergency Contact
                </Button>
              </div>
            )}
          </div>
        </motion.section>

        {/* My Collectives */}
        <motion.section
          variants={fadeUp}
          className="mt-6"
        >
          <SectionHeading
            icon={<TreePine size={14} />}
            iconBg="bg-moss-600"
            title="My Collectives"
          />
          {collectives && collectives.length > 0 ? (
            <div className="space-y-2.5">
              {collectives.map((membership) => {
                const collective = membership.collectives as {
                  id: string
                  name: string
                  slug: string
                  cover_image_url: string | null
                  region: string | null
                  member_count: number
                } | null
                if (!collective) return null
                return (
                  <Card
                    key={collective.id}
                    variant="collective"
                    onClick={() => navigate(`/collectives/${collective.slug}`)}
                    className="flex flex-row items-center gap-3 p-3 bg-gradient-to-r from-moss-100 via-moss-50 to-white shadow-md border border-moss-200/80"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-moss-300 to-primary-300 shadow-sm">
                      {collective.cover_image_url ? (
                        <img
                          src={collective.cover_image_url}
                          alt={collective.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <TreePine size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-sm text-primary-800 truncate">
                        {collective.name}
                      </p>
                      <p className="text-xs text-moss-600 font-medium">
                        {collective.region} · {collective.member_count} members
                      </p>
                    </div>
                    <Badge variant="default" size="sm">
                      {(membership.role ?? '').replace('_', ' ')}
                    </Badge>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              illustration="wildlife"
              title="No collectives yet"
              description="Join a local collective to start your conservation journey"
              action={{ label: 'Explore Collectives', to: '/collectives' }}
              className="min-h-[180px]"
            />
          )}
        </motion.section>

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <motion.section
            variants={fadeUp}
            className="mt-6"
          >
            <SectionHeading
              icon={<Sprout size={14} />}
              iconBg="bg-sprout-600"
              title="Interests"
            />
            <div className="rounded-2xl bg-gradient-to-br from-sprout-200/80 via-sprout-100 to-primary-100/60 border border-sprout-200 p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Chip key={interest} label={interest} selected />
                ))}
              </div>
            </div>
          </motion.section>
        )}

      </motion.div>
    </Page>
  )
}
