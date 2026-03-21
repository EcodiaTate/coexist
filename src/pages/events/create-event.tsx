import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Type,
  Calendar,
  MapPin,
  Settings2,
  Image,
  Eye,
  Users,
  Building2,
  CheckCircle2,
  TreePine,
  Waves,
  Sprout,
  Footprints,
  BookOpen,
  Bug,
  Scissors,
  Droplets,
  Flower2,
  HelpCircle,
  Repeat,
  Accessibility,
  Mountain,
  Shirt,
  Backpack,
  Sparkles,
  Check,
  Clock,
  EyeOff,
  Send,
  Camera,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useCollectiveRole } from '@/hooks/use-collective-role'
import {
  useCreateEvent,
  useInviteCollective,
  ACTIVITY_TYPE_OPTIONS,
} from '@/hooks/use-events'
import { supabase } from '@/lib/supabase'
import { useCamera } from '@/hooks/use-camera'
import { useImageUpload } from '@/hooks/use-image-upload'
import type { Database } from '@/types/database.types'
import {
  Page,
  Header,
  Button,
  Input,
  Dropdown,
  DatePicker,
  Toggle,
  Card,
  Badge,
  Skeleton,
  MapView,
  UploadProgress,
} from '@/components'
import type { MapCenter } from '@/components'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ActivityType = Database['public']['Enums']['activity_type']

interface EventFormData {
  // Step 1: Basics
  title: string
  activity_type: ActivityType | ''
  description: string
  // Step 2: Date & Time
  date_start: Date | null
  date_end: Date | null
  is_recurring: boolean
  recurring_type: 'weekly' | 'fortnightly' | 'monthly'
  recurring_count: number
  // Step 3: Location
  address: string
  location_lat: number | null
  location_lng: number | null
  // Step 4: Details
  capacity: string
  what_to_bring: string
  meeting_point: string
  wheelchair_access: boolean
  terrain: string
  difficulty: 'easy' | 'moderate' | 'challenging'
  what_to_wear: string
  // Step 5: Cover Image
  cover_image_url: string
  // Step 6: Visibility
  is_public: boolean
  // Step 7: Invite
  invite_collective: boolean
  // Step 8: Partner
  partner_name: string
  // Step 9: Review - no fields
}

const INITIAL_DATA: EventFormData = {
  title: '',
  activity_type: '',
  description: '',
  date_start: null,
  date_end: null,
  is_recurring: false,
  recurring_type: 'weekly',
  recurring_count: 4,
  address: '',
  location_lat: null,
  location_lng: null,
  capacity: '',
  what_to_bring: '',
  meeting_point: '',
  wheelchair_access: false,
  terrain: '',
  difficulty: 'easy',
  what_to_wear: '',
  cover_image_url: '',
  is_public: true,
  invite_collective: false,
  partner_name: '',
}

/* ------------------------------------------------------------------ */
/*  Step config                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    title: 'Basics',
    subtitle: 'Name your event and pick an activity',
    icon: <Type size={20} />,
    gradient: 'from-primary-500/20 via-sprout-400/10 to-transparent',
    accentColor: 'text-primary-600',
    accentBg: 'bg-primary-500',
  },
  {
    title: 'Date & Time',
    subtitle: 'When is it happening?',
    icon: <Calendar size={20} />,
    gradient: 'from-sky-400/15 via-primary-400/10 to-transparent',
    accentColor: 'text-sky-600',
    accentBg: 'bg-sky-500',
  },
  {
    title: 'Location',
    subtitle: 'Where should people meet?',
    icon: <MapPin size={20} />,
    gradient: 'from-sprout-400/20 via-moss-400/10 to-transparent',
    accentColor: 'text-sprout-600',
    accentBg: 'bg-sprout-500',
  },
  {
    title: 'Details',
    subtitle: 'Help attendees prepare',
    icon: <Settings2 size={20} />,
    gradient: 'from-bark-400/15 via-primary-400/10 to-transparent',
    accentColor: 'text-bark-600',
    accentBg: 'bg-bark-500',
  },
  {
    title: 'Cover Image',
    subtitle: 'Make your event stand out',
    icon: <Image size={20} />,
    gradient: 'from-coral-400/15 via-plum-400/10 to-transparent',
    accentColor: 'text-coral-600',
    accentBg: 'bg-coral-500',
  },
  {
    title: 'Visibility',
    subtitle: 'Who can see this event?',
    icon: <Eye size={20} />,
    gradient: 'from-plum-400/15 via-primary-400/10 to-transparent',
    accentColor: 'text-plum-600',
    accentBg: 'bg-plum-500',
  },
  {
    title: 'Invite',
    subtitle: 'Spread the word',
    icon: <Users size={20} />,
    gradient: 'from-moss-400/15 via-sky-400/10 to-transparent',
    accentColor: 'text-moss-600',
    accentBg: 'bg-moss-500',
  },
  {
    title: 'Partner',
    subtitle: 'Co-hosting with an organisation?',
    icon: <Building2 size={20} />,
    gradient: 'from-bark-400/15 via-primary-400/10 to-transparent',
    accentColor: 'text-bark-600',
    accentBg: 'bg-bark-500',
  },
  {
    title: 'Review',
    subtitle: 'Everything look good?',
    icon: <CheckCircle2 size={20} />,
    gradient: 'from-success-400/20 via-sprout-400/10 to-transparent',
    accentColor: 'text-success-600',
    accentBg: 'bg-success-500',
  },
]

/* ------------------------------------------------------------------ */
/*  Activity type icons                                                */
/* ------------------------------------------------------------------ */

const activityIcons: Record<string, React.ReactNode> = {
  tree_planting: <TreePine size={18} />,
  beach_cleanup: <Waves size={18} />,
  habitat_restoration: <Sprout size={18} />,
  nature_walk: <Footprints size={18} />,
  education: <BookOpen size={18} />,
  wildlife_survey: <Bug size={18} />,
  seed_collecting: <Sprout size={18} />,
  weed_removal: <Scissors size={18} />,
  waterway_cleanup: <Droplets size={18} />,
  community_garden: <Flower2 size={18} />,
  other: <HelpCircle size={18} />,
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

/** Styled card wrapper used inside each step */
function StepCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-surface-0 shadow-sm',
        'border border-primary-100/60',
        'p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Small section label inside step cards */
function SectionLabel({
  icon,
  children,
  className,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 mb-4',
        'text-overline tracking-wider text-primary-400',
        className,
      )}
    >
      {icon && <span className="text-primary-300">{icon}</span>}
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step Components                                                    */
/* ------------------------------------------------------------------ */

function StepBasics({
  data,
  onChange,
}: {
  data: EventFormData
  onChange: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<Sparkles size={14} />}>Event Info</SectionLabel>
        <div className="space-y-5">
          <Input
            label="Event Title"
            placeholder="e.g. Byron Bay Dune Planting Day"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />

          <Dropdown
            label="Activity Type"
            placeholder="Select activity type"
            value={data.activity_type || undefined}
            onChange={(v) => onChange({ activity_type: v as ActivityType })}
            options={ACTIVITY_TYPE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              icon: activityIcons[o.value],
            }))}
          />
        </div>
      </StepCard>

      <StepCard>
        <SectionLabel icon={<Type size={14} />}>Description</SectionLabel>
        <Input
          type="textarea"
          label="Description"
          placeholder="Tell people what this event is about, what you'll be doing, and why it matters..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={5}
        />
        <p className="text-caption text-primary-300 mt-2">
          Tip: Mention what impact this event will have
        </p>
      </StepCard>
    </div>
  )
}

function StepDateTime({
  data,
  onChange,
}: {
  data: EventFormData
  onChange: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<Clock size={14} />}>Schedule</SectionLabel>
        <div className="space-y-5">
          <DatePicker
            label="Start Date & Time"
            value={data.date_start}
            onChange={(d) => onChange({ date_start: d })}
            mode="datetime"
            min={new Date()}
          />

          <DatePicker
            label="End Date & Time"
            value={data.date_end}
            onChange={(d) => onChange({ date_end: d })}
            mode="datetime"
            min={data.date_start ?? new Date()}
          />
        </div>
      </StepCard>

      <StepCard>
        <SectionLabel icon={<Repeat size={14} />}>Recurring</SectionLabel>
        <Toggle
          label="Recurring Event"
          description="Create a series of events on a schedule"
          checked={data.is_recurring}
          onChange={(checked) => onChange({ is_recurring: checked })}
        />

        <AnimatePresence>
          {data.is_recurring && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-sky-200">
                <Dropdown
                  label="Frequency"
                  value={data.recurring_type}
                  onChange={(v) =>
                    onChange({
                      recurring_type: v as 'weekly' | 'fortnightly' | 'monthly',
                    })
                  }
                  options={[
                    {
                      value: 'weekly',
                      label: 'Weekly',
                      icon: <Repeat size={16} />,
                    },
                    {
                      value: 'fortnightly',
                      label: 'Fortnightly',
                      icon: <Repeat size={16} />,
                    },
                    {
                      value: 'monthly',
                      label: 'Monthly',
                      icon: <Repeat size={16} />,
                    },
                  ]}
                />

                <Input
                  label="Number of Events"
                  placeholder="4"
                  value={String(data.recurring_count)}
                  onChange={(e) =>
                    onChange({ recurring_count: parseInt(e.target.value) || 1 })
                  }
                />

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 text-sky-700 text-caption">
                  <Calendar size={14} />
                  This will create {data.recurring_count} linked events
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </StepCard>
    </div>
  )
}

function StepLocation({
  data,
  onChange,
}: {
  data: EventFormData
  onChange: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<MapPin size={14} />}>Address</SectionLabel>
        <Input
          label="Address"
          placeholder="Search for an address..."
          value={data.address}
          onChange={(e) => onChange({ address: e.target.value })}
          icon={<MapPin size={18} />}
        />
      </StepCard>

      {/* Map with draggable pin */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-primary-100/40">
        <MapView
          center={
            data.location_lat != null && data.location_lng != null
              ? { lat: data.location_lat, lng: data.location_lng }
              : { lat: -33.8688, lng: 151.2093 }
          }
          zoom={13}
          draggable
          onDragEnd={(pos: MapCenter) =>
            onChange({ location_lat: pos.lat, location_lng: pos.lng })
          }
          aria-label="Drag the pin to set event location"
          className="aspect-[16/10]"
        />
        <div className="px-4 py-2.5 bg-surface-0 text-caption text-primary-400 flex items-center gap-2">
          <MapPin size={13} className="text-sprout-500" />
          Drag the pin to set the exact location
        </div>
      </div>

      <StepCard>
        <SectionLabel icon={<Footprints size={14} />}>Meeting Point</SectionLabel>
        <Input
          label="Meeting Point Notes"
          placeholder="e.g. Meet at the car park near the northern entrance"
          value={data.meeting_point}
          onChange={(e) => onChange({ meeting_point: e.target.value })}
        />
      </StepCard>
    </div>
  )
}

function StepDetails({
  data,
  onChange,
}: {
  data: EventFormData
  onChange: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<Users size={14} />}>Capacity</SectionLabel>
        <Input
          label="Max Participants"
          placeholder="Leave empty for unlimited"
          value={data.capacity}
          onChange={(e) => onChange({ capacity: e.target.value })}
        />
      </StepCard>

      <StepCard>
        <SectionLabel icon={<Backpack size={14} />}>Preparation</SectionLabel>
        <div className="space-y-5">
          <Input
            type="textarea"
            label="What to Bring"
            placeholder="e.g. Water bottle, sunscreen, closed-toe shoes, gloves (we provide)"
            value={data.what_to_bring}
            onChange={(e) => onChange({ what_to_bring: e.target.value })}
            rows={3}
          />

          <Input
            type="textarea"
            label="What to Wear"
            placeholder="e.g. Long pants, hat, old clothes you don't mind getting dirty"
            value={data.what_to_wear}
            onChange={(e) => onChange({ what_to_wear: e.target.value })}
            rows={2}
          />
        </div>
      </StepCard>

      <StepCard>
        <SectionLabel icon={<Accessibility size={14} />}>
          Accessibility & Terrain
        </SectionLabel>
        <div className="space-y-5">
          <Toggle
            label="Wheelchair Accessible"
            description="The venue and route are wheelchair accessible"
            checked={data.wheelchair_access}
            onChange={(checked) => onChange({ wheelchair_access: checked })}
          />

          <Input
            label="Terrain Type"
            placeholder="e.g. Beach sand, bushland trail, flat parkland"
            value={data.terrain}
            onChange={(e) => onChange({ terrain: e.target.value })}
          />

          <Dropdown
            label="Difficulty"
            value={data.difficulty}
            onChange={(v) =>
              onChange({ difficulty: v as 'easy' | 'moderate' | 'challenging' })
            }
            options={[
              {
                value: 'easy',
                label: 'Easy - suitable for everyone',
                icon: (
                  <Mountain size={16} className="text-success-600" />
                ),
              },
              {
                value: 'moderate',
                label: 'Moderate - some fitness required',
                icon: (
                  <Mountain size={16} className="text-warning-600" />
                ),
              },
              {
                value: 'challenging',
                label: 'Challenging - good fitness needed',
                icon: (
                  <Mountain size={16} className="text-error-600" />
                ),
              },
            ]}
          />
        </div>
      </StepCard>
    </div>
  )
}

function StepCoverImage({
  data,
  onChange,
}: {
  data: EventFormData
  onChange: (updates: Partial<EventFormData>) => void
}) {
  const { capture, pickFromGallery, loading: cameraLoading } = useCamera()
  const {
    upload,
    progress,
    uploading,
    error: uploadError,
  } = useImageUpload({
    bucket: 'event-images',
    pathPrefix: 'covers',
  })

  const handleUpload = async (source: 'camera' | 'gallery') => {
    const result =
      source === 'camera' ? await capture() : await pickFromGallery()
    if (!result) return

    try {
      const uploaded = await upload(result.blob)
      onChange({ cover_image_url: uploaded.url })
    } catch {
      // error state handled by hook
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="relative rounded-2xl overflow-hidden shadow-md">
        <button
          type="button"
          onClick={() => handleUpload('gallery')}
          disabled={cameraLoading || uploading}
          className={cn(
            'w-full min-h-11 cursor-pointer select-none',
            'active:scale-[0.98] transition-all duration-200',
            'flex flex-col items-center justify-center',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            data.cover_image_url
              ? 'p-0'
              : 'py-20 bg-gradient-to-br from-surface-2 via-surface-1 to-primary-50',
          )}
          aria-label="Upload cover image"
        >
          {data.cover_image_url ? (
            <img
              src={data.cover_image_url}
              alt="Cover preview"
              className="w-full object-cover"
              style={{ aspectRatio: '16/9' }}
            />
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
                <Upload size={28} className="text-primary-400" />
              </div>
              <p className="text-sm font-semibold text-primary-700">
                Tap to upload a cover photo
              </p>
              <p className="text-caption text-primary-400 mt-1">
                JPG or PNG, recommended 16:9
              </p>
            </div>
          )}
        </button>
        <UploadProgress
          progress={progress}
          uploading={uploading}
          variant="overlay"
        />
      </div>

      <UploadProgress
        progress={progress}
        uploading={uploading}
        error={uploadError}
        variant="bar"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        {data.cover_image_url ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleUpload('gallery')}
              disabled={cameraLoading || uploading}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ cover_image_url: '' })}
            >
              Remove
            </Button>
          </>
        ) : (
          <StepCard className="w-full flex items-center gap-3 !p-3.5">
            <Camera size={18} className="text-primary-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary-700">
                Take a photo instead
              </p>
              <p className="text-caption text-primary-400">
                Use your camera to capture the location
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleUpload('camera')}
              disabled={cameraLoading || uploading}
              className="shrink-0"
            >
              Camera
            </Button>
          </StepCard>
        )}
      </div>
    </div>
  )
}

function StepVisibility({
  data,
  onChange,
}: {
  data: EventFormData
  onChange: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-primary-400 mb-1">
        Choose who can discover and register for this event.
      </p>

      {/* Public option */}
      <button
        type="button"
        onClick={() => onChange({ is_public: true })}
        className={cn(
          'w-full min-h-11 flex items-center gap-4 p-4 rounded-2xl cursor-pointer select-none text-left',
          'active:scale-[0.97] transition-all duration-200',
          'border',
          data.is_public
            ? 'border-primary-400 shadow-md bg-gradient-to-r from-primary-50 to-sprout-50 ring-1 ring-primary-300/50'
            : 'border-primary-100 bg-surface-0 hover:bg-surface-1',
        )}
      >
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            data.is_public
              ? 'bg-primary-500 text-white'
              : 'bg-surface-2 text-primary-400',
          )}
        >
          <Eye size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary-800">Public</p>
          <p className="text-caption text-primary-400 mt-0.5">
            Anyone can find and register for this event
          </p>
        </div>
        {data.is_public && (
          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
            <Check size={14} className="text-white" />
          </div>
        )}
      </button>

      {/* Collective only option */}
      <button
        type="button"
        onClick={() => onChange({ is_public: false })}
        className={cn(
          'w-full min-h-11 flex items-center gap-4 p-4 rounded-2xl cursor-pointer select-none text-left',
          'active:scale-[0.97] transition-all duration-200',
          'border',
          !data.is_public
            ? 'border-plum-400 shadow-md bg-gradient-to-r from-plum-50 to-primary-50 ring-1 ring-plum-300/50'
            : 'border-primary-100 bg-surface-0 hover:bg-surface-1',
        )}
      >
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            !data.is_public
              ? 'bg-plum-500 text-white'
              : 'bg-surface-2 text-primary-400',
          )}
        >
          <EyeOff size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary-800">
            Collective Only
          </p>
          <p className="text-caption text-primary-400 mt-0.5">
            Only members of your collective can see and register
          </p>
        </div>
        {!data.is_public && (
          <div className="w-6 h-6 rounded-full bg-plum-500 flex items-center justify-center shrink-0">
            <Check size={14} className="text-white" />
          </div>
        )}
      </button>
    </div>
  )
}

function StepInvite({
  data,
  onChange,
}: {
  data: EventFormData
  onChange: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<Send size={14} />}>Notifications</SectionLabel>
        <p className="text-sm text-primary-400 mb-4">
          Optionally invite all members of your collective. They'll receive a
          push notification and the event will appear in their "Invited" tab.
        </p>

        <Toggle
          label="Invite All Collective Members"
          description="Send invites to every member when this event is published"
          checked={data.invite_collective}
          onChange={(checked) => onChange({ invite_collective: checked })}
        />
      </StepCard>

      <AnimatePresence>
        {data.invite_collective && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-moss-50 to-sky-50 border border-moss-200/60">
              <div className="w-9 h-9 rounded-xl bg-moss-500 flex items-center justify-center shrink-0">
                <Users size={16} className="text-white" />
              </div>
              <p className="text-sm text-moss-700 font-medium">
                All active members will be notified when you publish.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StepPartner({
  data,
  onChange,
}: {
  data: EventFormData
  onChange: (updates: Partial<EventFormData>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<Building2 size={14} />}>
          Partner Organisation
        </SectionLabel>
        <p className="text-sm text-primary-400 mb-4">
          If this event is co-hosted or sponsored by an external organisation,
          add them here. Their name will appear on the event page.
        </p>

        <Input
          label="Partner Organisation (optional)"
          placeholder="e.g. Byron Shire Council, Patagonia"
          value={data.partner_name}
          onChange={(e) => onChange({ partner_name: e.target.value })}
        />
      </StepCard>

      {!data.partner_name && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-2/60 text-primary-400">
          <HelpCircle size={16} className="shrink-0 text-primary-300" />
          <p className="text-caption italic">
            You can skip this step - partners are optional.
          </p>
        </div>
      )}
    </div>
  )
}

function StepReview({ data }: { data: EventFormData }) {
  const activityLabel =
    ACTIVITY_TYPE_OPTIONS.find((o) => o.value === data.activity_type)?.label ??
    data.activity_type

  return (
    <div className="space-y-4">
      {/* Preview card */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-primary-100/40">
        <Card variant="event">
          {data.cover_image_url && (
            <Card.Image
              src={data.cover_image_url}
              alt={data.title || 'Event cover'}
            />
          )}
          <Card.Content>
            <Card.Title>{data.title || 'Untitled Event'}</Card.Title>
            <Card.Meta>
              {data.date_start
                ? new Intl.DateTimeFormat('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(data.date_start)
                : 'No date set'}
            </Card.Meta>
            {data.address && <Card.Meta>{data.address}</Card.Meta>}
          </Card.Content>
        </Card>
      </div>

      {/* Detail summary */}
      <StepCard className="!p-0 overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-primary-50 to-surface-1 border-b border-primary-100/60">
          <p className="text-overline tracking-wider text-primary-500">
            Event Summary
          </p>
        </div>
        <div className="px-5 py-2 divide-y divide-primary-50">
          <SummaryRow
            icon={
              activityIcons[data.activity_type] || <HelpCircle size={15} />
            }
            label="Activity"
            value={activityLabel}
          />
          <SummaryRow
            icon={<Calendar size={15} />}
            label="Date"
            value={
              data.date_start
                ? new Intl.DateTimeFormat('en-AU', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  }).format(data.date_start)
                : '-'
            }
          />
          {data.date_end && (
            <SummaryRow
              icon={<Clock size={15} />}
              label="Ends"
              value={new Intl.DateTimeFormat('en-AU', {
                timeStyle: 'short',
              }).format(data.date_end)}
            />
          )}
          <SummaryRow
            icon={<MapPin size={15} />}
            label="Location"
            value={data.address || '-'}
          />
          <SummaryRow
            icon={<Users size={15} />}
            label="Capacity"
            value={data.capacity || 'Unlimited'}
          />
          <SummaryRow
            icon={data.is_public ? <Eye size={15} /> : <EyeOff size={15} />}
            label="Visibility"
            value={data.is_public ? 'Public' : 'Collective Only'}
          />
          <SummaryRow
            icon={<Mountain size={15} />}
            label="Difficulty"
            value={
              data.difficulty.charAt(0).toUpperCase() +
              data.difficulty.slice(1)
            }
          />
          {data.is_recurring && (
            <SummaryRow
              icon={<Repeat size={15} />}
              label="Recurring"
              value={`${data.recurring_type}, ${data.recurring_count} events`}
            />
          )}
          {data.invite_collective && (
            <SummaryRow
              icon={<Send size={15} />}
              label="Invites"
              value="All collective members"
            />
          )}
          {data.partner_name && (
            <SummaryRow
              icon={<Building2 size={15} />}
              label="Partner"
              value={data.partner_name}
            />
          )}
        </div>
      </StepCard>

      {/* Ready banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-success-50 to-sprout-50 border border-success-200/60">
        <div className="w-9 h-9 rounded-xl bg-success-500 flex items-center justify-center shrink-0">
          <CheckCircle2 size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-success-700">
            Ready to publish
          </p>
          <p className="text-caption text-success-600/80">
            Your event will be visible immediately
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-primary-300 shrink-0">{icon}</span>
      <span className="text-caption text-primary-400 shrink-0 w-20">
        {label}
      </span>
      <span className="text-sm text-primary-800 font-medium text-right flex-1 min-w-0 truncate">
        {value}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Progress Stepper                                                   */
/* ------------------------------------------------------------------ */

function ProgressStepper({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-primary-100">
          <motion.div
            className={cn(
              'h-full rounded-full',
              i < currentStep
                ? 'bg-primary-500'
                : i === currentStep
                  ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                  : '',
            )}
            initial={false}
            animate={{
              width: i <= currentStep ? '100%' : '0%',
            }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Wizard                                                        */
/* ------------------------------------------------------------------ */

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back
  const [data, setData] = useState<EventFormData>(INITIAL_DATA)
  const [saveAsDraft, setSaveAsDraft] = useState(false)

  const createEvent = useCreateEvent()
  const inviteCollective = useInviteCollective()

  const isLastStep = step === STEPS.length - 1
  const isFirstStep = step === 0

  const updateData = useCallback((updates: Partial<EventFormData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return data.title.trim().length > 0 && data.activity_type !== ''
      case 1:
        return data.date_start !== null
      default:
        return true
    }
  }, [step, data])

  // We need the user's collective - use the first one they're a leader of
  const handlePublish = useCallback(
    async (asDraft = false) => {
      if (!user) return

      const isDraft = asDraft || saveAsDraft

      // Get user's collective membership
      const { data: memberships } = await supabase
        .from('collective_members')
        .select('collective_id, role')
        .eq('user_id', user.id)
        .in('role', ['leader', 'co_leader'])
        .limit(1)

      const collectiveId = memberships?.[0]?.collective_id
      if (!collectiveId) return

      // Validate date_end > date_start if both set
      if (
        data.date_start &&
        data.date_end &&
        data.date_end <= data.date_start
      ) {
        return
      }

      const capacityNum = data.capacity ? parseInt(data.capacity, 10) : null
      const event = await createEvent.mutateAsync({
        collective_id: collectiveId,
        title: data.title,
        description: data.description || null,
        activity_type:
          data.activity_type as Database['public']['Enums']['activity_type'],
        date_start: data.date_start!.toISOString(),
        date_end: data.date_end?.toISOString() ?? null,
        address: data.address || null,
        capacity: capacityNum && capacityNum > 0 ? capacityNum : null,
        cover_image_url: data.cover_image_url || null,
        is_public: data.is_public,
        status: isDraft ? 'draft' : 'published',
      })

      // Auto-invite collective if selected
      if (data.invite_collective && !isDraft) {
        await inviteCollective.mutateAsync({
          eventId: event.id,
          collectiveId,
        })
      }

      // Auto-post event as rich card to collective chat
      if (!isDraft) {
        const dateStr = data.date_start
          ? new Intl.DateTimeFormat('en-AU', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(data.date_start)
          : ''
        const chatContent = `New event created!\n\n**${data.title}**\n${dateStr}${data.address ? `\n${data.address}` : ''}\n\nTap to view and register → /events/${event.id}`
        try {
          await supabase.from('chat_messages').insert({
            collective_id: collectiveId,
            user_id: user.id,
            content: chatContent,
            message_type: 'event_card',
            metadata: { event_id: event.id, event_title: data.title },
          })
        } catch {
          // Non-critical
        }
      }

      navigate(`/events/${event.id}`, { replace: true })
    },
    [user, data, saveAsDraft, createEvent, inviteCollective, navigate],
  )

  const goNext = useCallback(() => {
    if (isLastStep) {
      handlePublish()
    } else {
      setDirection(1)
      setStep((s) => s + 1)
    }
  }, [isLastStep, handlePublish])

  const goBack = useCallback(() => {
    if (isFirstStep) {
      navigate(-1)
    } else {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }, [isFirstStep, navigate])

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
    }),
  }

  const stepComponents = [
    <StepBasics data={data} onChange={updateData} />,
    <StepDateTime data={data} onChange={updateData} />,
    <StepLocation data={data} onChange={updateData} />,
    <StepDetails data={data} onChange={updateData} />,
    <StepCoverImage data={data} onChange={updateData} />,
    <StepVisibility data={data} onChange={updateData} />,
    <StepInvite data={data} onChange={updateData} />,
    <StepPartner data={data} onChange={updateData} />,
    <StepReview data={data} />,
  ]

  const currentStep = STEPS[step]

  return (
    <Page
      header={
        <Header title="Create Event" back onBack={goBack} />
      }
      footer={
        <div className="space-y-2">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="ghost"
                onClick={goBack}
                className="shrink-0"
              >
                <ChevronLeft size={18} />
                Back
              </Button>
            )}
            <Button
              variant="primary"
              fullWidth
              disabled={!canProceed}
              loading={createEvent.isPending}
              onClick={goNext}
            >
              {isLastStep ? (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles size={18} />
                  Publish Event
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  Next
                  <ChevronRight size={18} className="shrink-0" />
                </span>
              )}
            </Button>
          </div>
          {isLastStep && (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => handlePublish(true)}
              loading={createEvent.isPending && saveAsDraft}
            >
              Save as Draft
            </Button>
          )}
        </div>
      }
    >
      {/* ---- Gradient hero header area ---- */}
      <div className="pt-3 pb-1">
        {/* Progress bar */}
        <ProgressStepper currentStep={step} totalSteps={STEPS.length} />

        {/* Step hero */}
        <motion.div
          key={step}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'mt-4 rounded-2xl p-4 bg-gradient-to-br',
            currentStep.gradient,
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center text-white',
                currentStep.accentBg,
              )}
            >
              {currentStep.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-bold text-primary-900">
                  {currentStep.title}
                </h2>
                <span className="text-caption text-primary-400 font-medium">
                  {step + 1}/{STEPS.length}
                </span>
              </div>
              <p className="text-caption text-primary-500 mt-0.5">
                {currentStep.subtitle}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ---- Step content with slide animation ---- */}
      <div className="pt-4 pb-8 min-h-[400px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={shouldReduceMotion ? undefined : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {stepComponents[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </Page>
  )
}
