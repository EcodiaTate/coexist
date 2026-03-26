import { useState, useCallback, useMemo, createContext, useContext } from 'react'
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
    Droplets,
    Flower2,
    Repeat,
    Accessibility,
    Mountain,
    Backpack,
    Sparkles,
    Check,
    Clock,
    EyeOff,
    Send,
    Upload,
    HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
    useCreateEvent,
    useInviteCollective,
    ACTIVITY_TYPE_OPTIONS,
} from '@/hooks/use-events'
import { supabase } from '@/lib/supabase'
import { useEventForm } from '@/hooks/use-event-form'
import type { EventFormFields, ActivityType } from '@/hooks/use-event-form'
import {
    BasicsFields,
    DateTimeFields,
    LocationFields,
    CoverImageFields,
} from './components/event-form-fields'
import type { Database } from '@/types/database.types'
import {
    Page,
    Header,
    Button,
    Input,
    Dropdown,
    Toggle,
    Card,
    MapView,
    UploadProgress,
} from '@/components'
import { useToast } from '@/components/toast'
import type { MapCenter } from '@/components'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Create-only form data (extends shared fields)                      */
/* ------------------------------------------------------------------ */

interface CreateExtraFields {
  is_recurring: boolean
  recurring_type: 'weekly' | 'fortnightly' | 'monthly'
  recurring_count: number
  what_to_bring: string
  meeting_point: string
  wheelchair_access: boolean
  terrain: string
  difficulty: 'easy' | 'moderate' | 'challenging'
  what_to_wear: string
  invite_collective: boolean
  partner_name: string
}

const INITIAL_EXTRA: CreateExtraFields = {
  is_recurring: false,
  recurring_type: 'weekly',
  recurring_count: 4,
  what_to_bring: '',
  meeting_point: '',
  wheelchair_access: false,
  terrain: '',
  difficulty: 'easy',
  what_to_wear: '',
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
    cardBorder: 'border-l-primary-400',
    cardGlow: 'bg-primary-50/40',
  },
  {
    title: 'Date & Time',
    subtitle: 'When is it happening?',
    icon: <Calendar size={20} />,
    gradient: 'from-sky-400/15 via-primary-400/10 to-transparent',
    accentColor: 'text-sky-600',
    accentBg: 'bg-sky-500',
    cardBorder: 'border-l-sky-400',
    cardGlow: 'bg-sky-50/40',
  },
  {
    title: 'Location',
    subtitle: 'Where should people meet?',
    icon: <MapPin size={20} />,
    gradient: 'from-sprout-400/20 via-moss-400/10 to-transparent',
    accentColor: 'text-sprout-600',
    accentBg: 'bg-sprout-500',
    cardBorder: 'border-l-sprout-400',
    cardGlow: 'bg-sprout-50/40',
  },
  {
    title: 'Details',
    subtitle: 'Help attendees prepare',
    icon: <Settings2 size={20} />,
    gradient: 'from-bark-400/15 via-primary-400/10 to-transparent',
    accentColor: 'text-bark-600',
    accentBg: 'bg-bark-500',
    cardBorder: 'border-l-bark-400',
    cardGlow: 'bg-bark-50/40',
  },
  {
    title: 'Cover Image',
    subtitle: 'Make your event stand out',
    icon: <Image size={20} />,
    gradient: 'from-coral-400/15 via-plum-400/10 to-transparent',
    accentColor: 'text-coral-600',
    accentBg: 'bg-coral-500',
    cardBorder: 'border-l-coral-400',
    cardGlow: 'bg-coral-50/40',
  },
  {
    title: 'Visibility',
    subtitle: 'Who can see this event?',
    icon: <Eye size={20} />,
    gradient: 'from-plum-400/15 via-primary-400/10 to-transparent',
    accentColor: 'text-plum-600',
    accentBg: 'bg-plum-500',
    cardBorder: 'border-l-plum-400',
    cardGlow: 'bg-plum-50/40',
  },
  {
    title: 'Invite',
    subtitle: 'Spread the word',
    icon: <Users size={20} />,
    gradient: 'from-moss-400/15 via-sky-400/10 to-transparent',
    accentColor: 'text-moss-600',
    accentBg: 'bg-moss-500',
    cardBorder: 'border-l-moss-400',
    cardGlow: 'bg-moss-50/40',
  },
  {
    title: 'Partner',
    subtitle: 'Co-hosting with an organisation?',
    icon: <Building2 size={20} />,
    gradient: 'from-bark-400/15 via-primary-400/10 to-transparent',
    accentColor: 'text-bark-600',
    accentBg: 'bg-bark-500',
    cardBorder: 'border-l-bark-400',
    cardGlow: 'bg-bark-50/40',
  },
  {
    title: 'Review',
    subtitle: 'Everything look good?',
    icon: <CheckCircle2 size={20} />,
    gradient: 'from-success-400/20 via-sprout-400/10 to-transparent',
    accentColor: 'text-success-600',
    accentBg: 'bg-success-500',
    cardBorder: 'border-l-success-400',
    cardGlow: 'bg-success-50/40',
  },
]

/* ------------------------------------------------------------------ */
/*  Activity type icons                                                */
/* ------------------------------------------------------------------ */

const activityIcons: Record<string, React.ReactNode> = {
  shore_cleanup: <Waves size={18} />,
  tree_planting: <TreePine size={18} />,
  land_regeneration: <Sprout size={18} />,
  nature_walk: <Footprints size={18} />,
  camp_out: <Mountain size={18} />,
  retreat: <Flower2 size={18} />,
  film_screening: <Eye size={18} />,
  marine_restoration: <Droplets size={18} />,
  workshop: <BookOpen size={18} />,
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

/* Step color context  lets StepCard auto-pick the current step's accent */
const StepColorCtx = createContext<{ cardBorder: string; cardGlow: string }>({
  cardBorder: 'border-l-primary-300',
  cardGlow: 'bg-surface-0',
})

/** Styled card wrapper used inside each step */
function StepCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { cardBorder, cardGlow } = useContext(StepColorCtx)
  return (
    <div
      className={cn(
        'rounded-2xl shadow-sm',
        'border border-primary-100/60',
        'border-l-[3px]',
        cardBorder,
        cardGlow,
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
  fields,
  onChange,
}: {
  fields: EventFormFields
  onChange: (updates: Partial<EventFormFields>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<Sparkles size={14} />}>Event Info</SectionLabel>
        <div className="space-y-5">
          <Input
            label="Event Title"
            placeholder="e.g. Byron Bay Dune Planting Day"
            value={fields.title}
            onChange={(e) => onChange({ title: e.target.value })}
            required
          />

          <Dropdown
            label="Activity Type"
            placeholder="Select activity type"
            value={fields.activity_type || undefined}
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
          value={fields.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={5}
        />
      </StepCard>
    </div>
  )
}

function StepDateTime({
  fields,
  onChange,
  extra,
  onExtraChange,
}: {
  fields: EventFormFields
  onChange: (updates: Partial<EventFormFields>) => void
  extra: CreateExtraFields
  onExtraChange: (updates: Partial<CreateExtraFields>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<Clock size={14} />}>Schedule</SectionLabel>
        <div className="space-y-5">
          <DateTimeFields fields={fields} onChange={onChange} minStart={new Date()} />
        </div>
      </StepCard>

      <StepCard>
        <SectionLabel icon={<Repeat size={14} />}>Recurring</SectionLabel>
        <Toggle
          label="Recurring Event"
          description="Create a series of events on a schedule"
          checked={extra.is_recurring}
          onChange={(checked) => onExtraChange({ is_recurring: checked })}
        />

        <AnimatePresence>
          {extra.is_recurring && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-sky-200">
                <Dropdown
                  label="Frequency"
                  value={extra.recurring_type}
                  onChange={(v) =>
                    onExtraChange({
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
                  value={String(extra.recurring_count)}
                  onChange={(e) =>
                    onExtraChange({ recurring_count: parseInt(e.target.value) || 1 })
                  }
                />

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 text-sky-700 text-caption">
                  <Calendar size={14} />
                  This will create {extra.recurring_count} linked events
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
  fields,
  onChange,
  extra,
  onExtraChange,
}: {
  fields: EventFormFields
  onChange: (updates: Partial<EventFormFields>) => void
  extra: CreateExtraFields
  onExtraChange: (updates: Partial<CreateExtraFields>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<MapPin size={14} />}>Address</SectionLabel>
        <Input
          label="Address"
          placeholder="Search for an address..."
          value={fields.address}
          onChange={(e) => onChange({ address: e.target.value })}
          icon={<MapPin size={18} />}
        />
      </StepCard>

      {/* Map with draggable pin */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-primary-100/40">
        <MapView
          center={
            fields.location_lat != null && fields.location_lng != null
              ? { lat: fields.location_lat, lng: fields.location_lng }
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
          value={extra.meeting_point}
          onChange={(e) => onExtraChange({ meeting_point: e.target.value })}
        />
      </StepCard>
    </div>
  )
}

function StepDetails({
  fields,
  onChange,
  extra,
  onExtraChange,
}: {
  fields: EventFormFields
  onChange: (updates: Partial<EventFormFields>) => void
  extra: CreateExtraFields
  onExtraChange: (updates: Partial<CreateExtraFields>) => void
}) {
  return (
    <div className="space-y-4">
      <StepCard>
        <SectionLabel icon={<Users size={14} />}>Capacity</SectionLabel>
        <Input
          label="Max Participants"
          placeholder="Leave empty for unlimited"
          value={fields.capacity}
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
            value={extra.what_to_bring}
            onChange={(e) => onExtraChange({ what_to_bring: e.target.value })}
            rows={3}
          />

          <Input
            type="textarea"
            label="What to Wear"
            placeholder="e.g. Long pants, hat, old clothes you don't mind getting dirty"
            value={extra.what_to_wear}
            onChange={(e) => onExtraChange({ what_to_wear: e.target.value })}
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
            checked={extra.wheelchair_access}
            onChange={(checked) => onExtraChange({ wheelchair_access: checked })}
          />

          <Input
            label="Terrain Type"
            placeholder="e.g. Beach sand, bushland trail, flat parkland"
            value={extra.terrain}
            onChange={(e) => onExtraChange({ terrain: e.target.value })}
          />

          <Dropdown
            label="Difficulty"
            value={extra.difficulty}
            onChange={(v) =>
              onExtraChange({ difficulty: v as 'easy' | 'moderate' | 'challenging' })
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
  coverImageUrl,
  onUploadGallery,
  onUploadCamera,
  onRemove,
  uploading,
  cameraLoading,
  uploadProgress,
  uploadError,
}: {
  coverImageUrl: string
  onUploadGallery: () => void
  onUploadCamera: () => void
  onRemove: () => void
  uploading: boolean
  cameraLoading: boolean
  uploadProgress: number | null
  uploadError: string | null
}) {
  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="relative rounded-2xl overflow-hidden shadow-md">
        <button
          type="button"
          onClick={onUploadGallery}
          disabled={cameraLoading || uploading}
          className={cn(
            'w-full min-h-11 cursor-pointer select-none',
            'active:scale-[0.98] transition-transform duration-200',
            'flex flex-col items-center justify-center',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            coverImageUrl
              ? 'p-0'
              : 'py-20 bg-gradient-to-br from-surface-2 via-surface-1 to-primary-50',
          )}
          aria-label="Upload cover image"
        >
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
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
          progress={uploadProgress}
          uploading={uploading}
          variant="overlay"
        />
      </div>

      <UploadProgress
        progress={uploadProgress}
        uploading={uploading}
        error={uploadError}
        variant="bar"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        {coverImageUrl ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={onUploadGallery}
              disabled={cameraLoading || uploading}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
            >
              Remove
            </Button>
          </>
        ) : (
          <StepCard className="w-full flex items-center gap-3 !p-3.5">
            <span className="text-primary-400 shrink-0"><Image size={18} /></span>
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
              onClick={onUploadCamera}
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
  fields,
  onChange,
}: {
  fields: EventFormFields
  onChange: (updates: Partial<EventFormFields>) => void
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
          'active:scale-[0.97] transition-transform duration-200',
          'border',
          fields.is_public
            ? 'border-primary-400 shadow-md bg-gradient-to-r from-primary-50 to-sprout-50 ring-1 ring-primary-300/50'
            : 'border-primary-100 bg-surface-0 hover:bg-surface-1',
        )}
      >
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            fields.is_public
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
        {fields.is_public && (
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
          'active:scale-[0.97] transition-transform duration-200',
          'border',
          !fields.is_public
            ? 'border-plum-400 shadow-md bg-gradient-to-r from-plum-50 to-primary-50 ring-1 ring-plum-300/50'
            : 'border-primary-100 bg-surface-0 hover:bg-surface-1',
        )}
      >
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            !fields.is_public
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
        {!fields.is_public && (
          <div className="w-6 h-6 rounded-full bg-plum-500 flex items-center justify-center shrink-0">
            <Check size={14} className="text-white" />
          </div>
        )}
      </button>
    </div>
  )
}

function StepInvite({
  extra,
  onExtraChange,
}: {
  extra: CreateExtraFields
  onExtraChange: (updates: Partial<CreateExtraFields>) => void
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
          checked={extra.invite_collective}
          onChange={(checked) => onExtraChange({ invite_collective: checked })}
        />
      </StepCard>

      <AnimatePresence>
        {extra.invite_collective && (
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
  extra,
  onExtraChange,
}: {
  extra: CreateExtraFields
  onExtraChange: (updates: Partial<CreateExtraFields>) => void
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
          value={extra.partner_name}
          onChange={(e) => onExtraChange({ partner_name: e.target.value })}
        />
      </StepCard>

      {!extra.partner_name && (
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

function StepReview({ fields, extra }: { fields: EventFormFields; extra: CreateExtraFields }) {
  const activityLabel =
    ACTIVITY_TYPE_OPTIONS.find((o) => o.value === fields.activity_type)?.label ??
    fields.activity_type

  return (
    <div className="space-y-4">
      {/* Preview card */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-primary-100/40">
        <Card variant="event">
          {fields.cover_image_url && (
            <Card.Image
              src={fields.cover_image_url}
              alt={fields.title || 'Event cover'}
            />
          )}
          <Card.Content>
            <Card.Title>{fields.title || 'Untitled Event'}</Card.Title>
            <Card.Meta>
              {fields.date_start
                ? new Intl.DateTimeFormat('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(fields.date_start)
                : 'No date set'}
            </Card.Meta>
            {fields.address && <Card.Meta>{fields.address}</Card.Meta>}
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
              activityIcons[fields.activity_type] || <HelpCircle size={15} />
            }
            label="Activity"
            value={activityLabel}
          />
          <SummaryRow
            icon={<Calendar size={15} />}
            label="Date"
            value={
              fields.date_start
                ? new Intl.DateTimeFormat('en-AU', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  }).format(fields.date_start)
                : '-'
            }
          />
          {fields.date_end && (
            <SummaryRow
              icon={<Clock size={15} />}
              label="Ends"
              value={new Intl.DateTimeFormat('en-AU', {
                timeStyle: 'short',
              }).format(fields.date_end)}
            />
          )}
          <SummaryRow
            icon={<MapPin size={15} />}
            label="Location"
            value={fields.address || '-'}
          />
          <SummaryRow
            icon={<Users size={15} />}
            label="Capacity"
            value={fields.capacity || 'Unlimited'}
          />
          <SummaryRow
            icon={fields.is_public ? <Eye size={15} /> : <EyeOff size={15} />}
            label="Visibility"
            value={fields.is_public ? 'Public' : 'Collective Only'}
          />
          <SummaryRow
            icon={<Mountain size={15} />}
            label="Difficulty"
            value={
              extra.difficulty.charAt(0).toUpperCase() +
              extra.difficulty.slice(1)
            }
          />
          {extra.is_recurring && (
            <SummaryRow
              icon={<Repeat size={15} />}
              label="Recurring"
              value={`${extra.recurring_type}, ${extra.recurring_count} events`}
            />
          )}
          {extra.invite_collective && (
            <SummaryRow
              icon={<Send size={15} />}
              label="Invites"
              value="All collective members"
            />
          )}
          {extra.partner_name && (
            <SummaryRow
              icon={<Building2 size={15} />}
              label="Partner"
              value={extra.partner_name}
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
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex-1 h-2 rounded-full overflow-hidden bg-primary-100/80">
          <motion.div
            className={cn(
              'h-full rounded-full',
              i < currentStep
                ? STEPS[i].accentBg
                : i === currentStep
                  ? cn(STEPS[i].accentBg, 'opacity-80')
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
  const { user } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back
  const [extra, setExtra] = useState<CreateExtraFields>(INITIAL_EXTRA)
  const [saveAsDraft] = useState(false)

  const form = useEventForm({ mode: 'create' })

  const createEvent = useCreateEvent()
  const inviteCollective = useInviteCollective()
  const { toast: toastApi } = useToast()

  const isLastStep = step === STEPS.length - 1
  const isFirstStep = step === 0

  const updateExtra = useCallback((updates: Partial<CreateExtraFields>) => {
    setExtra((prev) => ({ ...prev, ...updates }))
  }, [])

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return form.isBasicsValid
      case 1:
        return form.isDateValid
      default:
        return true
    }
  }, [step, form.isBasicsValid, form.isDateValid])

  // We need the user's collective - use the first one they're a leader of
  const handlePublish = useCallback(
    async (asDraft = false) => {
      if (!user) return

      const isDraft = asDraft || saveAsDraft

      // Validate date_end > date_start if both set
      if (
        form.fields.date_start &&
        form.fields.date_end &&
        form.fields.date_end <= form.fields.date_start
      ) {
        toastApi.error('End date must be after start date')
        return
      }

      try {
        // Get user's collective membership
        const { data: memberships, error: membershipError } = await supabase
          .from('collective_members')
          .select('collective_id, role')
          .eq('user_id', user.id)
          .in('role', ['leader', 'co_leader', 'assist_leader'])
          .limit(1)

        if (membershipError) throw membershipError

        const collectiveId = memberships?.[0]?.collective_id
        if (!collectiveId) {
          toastApi.error('You must be a leader of a collective to create events')
          return
        }

        const event = await createEvent.mutateAsync({
          collective_id: collectiveId,
          title: form.fields.title,
          description: form.fields.description || null,
          activity_type:
            form.fields.activity_type as Database['public']['Enums']['activity_type'],
          date_start: form.fields.date_start!.toISOString(),
          date_end: form.fields.date_end?.toISOString() ?? null,
          address: form.fields.address || null,
          location_point: form.buildLocationPoint(),
          capacity: form.parsedCapacity(),
          cover_image_url: form.fields.cover_image_url || null,
          is_public: form.fields.is_public,
          status: isDraft ? 'draft' : 'published',
        })

        // Auto-invite collective if selected
        if (extra.invite_collective && !isDraft) {
          await inviteCollective.mutateAsync({
            eventId: event.id,
            collectiveId,
          })
        }

        // Auto-post event as rich card to collective chat
        if (!isDraft) {
          const dateStr = form.fields.date_start
            ? new Intl.DateTimeFormat('en-AU', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(form.fields.date_start)
            : ''
          const chatContent = `New event created!\n\n**${form.fields.title}**\n${dateStr}${form.fields.address ? `\n${form.fields.address}` : ''}\n\nTap to view and register → /events/${event.id}`
          try {
            await supabase.from('chat_messages').insert({
              collective_id: collectiveId,
              user_id: user.id,
              content: chatContent,
              message_type: 'event_card',
              metadata: { event_id: event.id, event_title: form.fields.title },
            })
          } catch {
            // Non-critical
          }
        }

        navigate(`/events/${event.id}`, { replace: true })
      } catch (err) {
        console.error('[create-event] publish failed:', err)
        toastApi.error(
          isDraft ? 'Failed to save draft' : 'Failed to publish event',
        )
      }
    },
    [user, form, extra, saveAsDraft, createEvent, inviteCollective, navigate, toastApi],
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
    <StepBasics fields={form.fields} onChange={form.updateFields} />,
    <StepDateTime fields={form.fields} onChange={form.updateFields} extra={extra} onExtraChange={updateExtra} />,
    <StepLocation fields={form.fields} onChange={form.updateFields} extra={extra} onExtraChange={updateExtra} />,
    <StepDetails fields={form.fields} onChange={form.updateFields} extra={extra} onExtraChange={updateExtra} />,
    <StepCoverImage
      coverImageUrl={form.fields.cover_image_url}
      onUploadGallery={form.handleUploadFromGallery}
      onUploadCamera={form.handleUploadFromCamera}
      onRemove={form.removeCoverImage}
      uploading={form.uploading}
      cameraLoading={form.cameraLoading}
      uploadProgress={form.uploadProgress}
      uploadError={form.uploadError}
    />,
    <StepVisibility fields={form.fields} onChange={form.updateFields} />,
    <StepInvite extra={extra} onExtraChange={updateExtra} />,
    <StepPartner extra={extra} onExtraChange={updateExtra} />,
    <StepReview fields={form.fields} extra={extra} />,
  ]

  const currentStep = STEPS[step]

  return (
    <Page
      swipeBack
      fullBleed
      header={
        <Header title="Create Event" back transparent onBack={goBack} />
      }
      footer={
        <div className={cn(
          'py-3 space-y-2',
          isLastStep
            ? 'bg-gradient-to-r from-success-50 via-sprout-50/50 to-moss-50'
            : 'bg-gradient-to-r from-primary-50/60 via-surface-0 to-moss-50/40',
        )}>
          <div className="flex gap-2 px-4">
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
            <div className="px-4">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => handlePublish(true)}
                loading={createEvent.isPending && saveAsDraft}
              >
                Save as Draft
              </Button>
            </div>
          )}
        </div>
      }
    >
      {/* ---- Gradient hero header area ---- */}
      <div className="pt-3 pb-1 px-4">
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
      <div className="pt-4 pb-4 min-h-[400px] px-4">
        <StepColorCtx.Provider value={{ cardBorder: currentStep.cardBorder, cardGlow: currentStep.cardGlow }}>
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
        </StepColorCtx.Provider>
      </div>
    </Page>
  )
}
