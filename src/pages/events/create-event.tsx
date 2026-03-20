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
  { title: 'Basics', icon: <Type size={18} /> },
  { title: 'Date & Time', icon: <Calendar size={18} /> },
  { title: 'Location', icon: <MapPin size={18} /> },
  { title: 'Details', icon: <Settings2 size={18} /> },
  { title: 'Cover Image', icon: <Image size={18} /> },
  { title: 'Visibility', icon: <Eye size={18} /> },
  { title: 'Invite', icon: <Users size={18} /> },
  { title: 'Partner', icon: <Building2 size={18} /> },
  { title: 'Review', icon: <CheckCircle2 size={18} /> },
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

      <Input
        type="textarea"
        label="Description"
        placeholder="Tell people what this event is about, what you'll be doing, and why it matters..."
        value={data.description}
        onChange={(e) => onChange({ description: e.target.value })}
        rows={5}
      />
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

      <div className="pt-2">
        <Toggle
          label="Recurring Event"
          description="Create a series of events on a schedule"
          checked={data.is_recurring}
          onChange={(checked) => onChange({ is_recurring: checked })}
        />
      </div>

      {data.is_recurring && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 pl-4 border-l-2 border-primary-200"
        >
          <Dropdown
            label="Frequency"
            value={data.recurring_type}
            onChange={(v) => onChange({ recurring_type: v as 'weekly' | 'fortnightly' | 'monthly' })}
            options={[
              { value: 'weekly', label: 'Weekly', icon: <Repeat size={16} /> },
              { value: 'fortnightly', label: 'Fortnightly', icon: <Repeat size={16} /> },
              { value: 'monthly', label: 'Monthly', icon: <Repeat size={16} /> },
            ]}
          />

          <Input
            label="Number of Events"
            placeholder="4"
            value={String(data.recurring_count)}
            onChange={(e) => onChange({ recurring_count: parseInt(e.target.value) || 1 })}
          />

          <p className="text-caption text-primary-400">
            This will create {data.recurring_count} linked events.
          </p>
        </motion.div>
      )}
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
    <div className="space-y-5">
      <Input
        label="Address"
        placeholder="Search for an address..."
        value={data.address}
        onChange={(e) => onChange({ address: e.target.value })}
        icon={<MapPin size={18} />}
      />

      {/* Map with draggable pin */}
      <MapView
        center={
          data.location_lat != null && data.location_lng != null
            ? { lat: data.location_lat, lng: data.location_lng }
            : { lat: -33.8688, lng: 151.2093 }
        }
        zoom={13}
        draggable
        onDragEnd={(pos: MapCenter) => onChange({ location_lat: pos.lat, location_lng: pos.lng })}
        aria-label="Drag the pin to set event location"
        className="aspect-[16/10] rounded-xl shadow-sm"
      />

      <Input
        label="Meeting Point Notes"
        placeholder="e.g. Meet at the car park near the northern entrance"
        value={data.meeting_point}
        onChange={(e) => onChange({ meeting_point: e.target.value })}
      />
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
    <div className="space-y-5">
      <Input
        label="Capacity"
        placeholder="Max number of participants (leave empty for unlimited)"
        value={data.capacity}
        onChange={(e) => onChange({ capacity: e.target.value })}
      />

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

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
          <Accessibility size={16} className="text-primary-400" />
          Accessibility
        </h3>

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
          onChange={(v) => onChange({ difficulty: v as 'easy' | 'moderate' | 'challenging' })}
          options={[
            { value: 'easy', label: 'Easy - suitable for everyone', icon: <Mountain size={16} className="text-success-600" /> },
            { value: 'moderate', label: 'Moderate - some fitness required', icon: <Mountain size={16} className="text-warning-600" /> },
            { value: 'challenging', label: 'Challenging - good fitness needed', icon: <Mountain size={16} className="text-error-600" /> },
          ]}
        />
      </div>
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
  const { upload, progress, uploading, error: uploadError } = useImageUpload({
    bucket: 'event-images',
    pathPrefix: 'covers',
  })

  const handleUpload = async (source: 'camera' | 'gallery') => {
    const result = source === 'camera' ? await capture() : await pickFromGallery()
    if (!result) return

    try {
      const uploaded = await upload(result.blob)
      onChange({ cover_image_url: uploaded.url })
    } catch {
      // error state handled by hook
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-primary-400">
        Add a cover photo to make your event stand out. Use a real photo from a
        past event or of the location.
      </p>

      {/* Upload area */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleUpload('gallery')}
          disabled={cameraLoading || uploading}
          className={cn(
            'w-full min-h-11 rounded-xl border-2 border-dashed border-primary-200 hover:border-primary-400',
            'cursor-pointer select-none',
            'active:scale-[0.97] transition-all duration-150',
            'flex flex-col items-center justify-center',
            'text-primary-400 hover:text-primary-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            data.cover_image_url ? 'p-0 overflow-hidden' : 'py-16',
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
            <>
              <Image size={40} />
              <p className="text-sm font-medium mt-3">Tap to upload a cover photo</p>
              <p className="text-caption mt-1">Camera or gallery</p>
            </>
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

      <div className="flex gap-2">
        {data.cover_image_url ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ cover_image_url: '' })}
          >
            Remove Image
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUpload('camera')}
            disabled={cameraLoading || uploading}
          >
            Take Photo
          </Button>
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
    <div className="space-y-5">
      <p className="text-sm text-primary-400">
        Choose who can discover and register for this event.
      </p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onChange({ is_public: true })}
          className={cn(
            'w-full min-h-11 flex items-start gap-3 p-4 rounded-xl cursor-pointer select-none text-left',
            'active:scale-[0.97] transition-all duration-150',
            data.is_public ? 'ring-2 ring-primary-500 shadow-sm bg-primary-100' : 'bg-primary-50/60',
          )}
        >
          <Eye size={20} className={data.is_public ? 'text-primary-400' : 'text-primary-400'} />
          <div>
            <p className="text-sm font-semibold text-primary-800">Public</p>
            <p className="text-caption text-primary-400 mt-0.5">
              Anyone can find and register for this event
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ is_public: false })}
          className={cn(
            'w-full min-h-11 flex items-start gap-3 p-4 rounded-xl cursor-pointer select-none text-left',
            'active:scale-[0.97] transition-all duration-150',
            !data.is_public ? 'ring-2 ring-primary-500 shadow-sm bg-primary-100' : 'bg-primary-50/60',
          )}
        >
          <Users size={20} className={!data.is_public ? 'text-primary-400' : 'text-primary-400'} />
          <div>
            <p className="text-sm font-semibold text-primary-800">Collective Only</p>
            <p className="text-caption text-primary-400 mt-0.5">
              Only members of your collective can see and register
            </p>
          </div>
        </button>
      </div>
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
    <div className="space-y-5">
      <p className="text-sm text-primary-400">
        Optionally invite all members of your collective. They'll receive a push
        notification and the event will appear in their "Invited" tab.
      </p>

      <Toggle
        label="Invite All Collective Members"
        description="Send invites to every member when this event is published"
        checked={data.invite_collective}
        onChange={(checked) => onChange({ invite_collective: checked })}
      />

      {data.invite_collective && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white text-primary-400 text-sm">
          <Users size={16} />
          All active members will be notified when you publish.
        </div>
      )}
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
    <div className="space-y-5">
      <p className="text-sm text-primary-400">
        If this event is co-hosted or sponsored by an external organisation,
        add them here. Their logo will appear on the event page.
      </p>

      <Input
        label="Partner Organisation (optional)"
        placeholder="e.g. Byron Shire Council, Patagonia"
        value={data.partner_name}
        onChange={(e) => onChange({ partner_name: e.target.value })}
      />

      {!data.partner_name && (
        <p className="text-caption text-primary-400 italic">
          You can skip this step - partners are optional.
        </p>
      )}
    </div>
  )
}

function StepReview({
  data,
}: {
  data: EventFormData
}) {
  const activityLabel = ACTIVITY_TYPE_OPTIONS.find((o) => o.value === data.activity_type)?.label ?? data.activity_type

  return (
    <div className="space-y-5">
      <p className="text-sm text-primary-400">
        Review your event details before publishing.
      </p>

      {/* Preview card */}
      <Card variant="event">
        {data.cover_image_url && (
          <Card.Image src={data.cover_image_url} alt={data.title || 'Event cover'} />
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

      {/* Detail summary */}
      <div className="space-y-2 text-sm">
        <SummaryRow label="Activity" value={activityLabel} />
        <SummaryRow
          label="Date"
          value={
            data.date_start
              ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'full', timeStyle: 'short' }).format(data.date_start)
              : '-'
          }
        />
        {data.date_end && (
          <SummaryRow
            label="Ends"
            value={new Intl.DateTimeFormat('en-AU', { timeStyle: 'short' }).format(data.date_end)}
          />
        )}
        <SummaryRow label="Location" value={data.address || '-'} />
        <SummaryRow label="Capacity" value={data.capacity || 'Unlimited'} />
        <SummaryRow label="Visibility" value={data.is_public ? 'Public' : 'Collective Only'} />
        <SummaryRow label="Difficulty" value={data.difficulty} />
        {data.is_recurring && (
          <SummaryRow
            label="Recurring"
            value={`${data.recurring_type}, ${data.recurring_count} events`}
          />
        )}
        {data.invite_collective && (
          <SummaryRow label="Invites" value="All collective members" />
        )}
        {data.partner_name && (
          <SummaryRow label="Partner" value={data.partner_name} />
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-primary-400">{label}</span>
      <span className="text-primary-800 font-medium text-right max-w-[60%]">{value}</span>
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
      case 2:
        return true // Location optional
      case 3:
        return true
      case 4:
        return true
      case 5:
        return true
      case 6:
        return true
      case 7:
        return true
      case 8:
        return true
      default:
        return true
    }
  }, [step, data])

  // We need the user's collective - use the first one they're a leader of
  // (In production this would be selectable if they lead multiple)
  const handlePublish = useCallback(async (asDraft = false) => {
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
    if (data.date_start && data.date_end && data.date_end <= data.date_start) {
      return // Should show toast - for now silently prevent invalid submission
    }

    const capacityNum = data.capacity ? parseInt(data.capacity, 10) : null
    const event = await createEvent.mutateAsync({
      collective_id: collectiveId,
      title: data.title,
      description: data.description || null,
      activity_type: data.activity_type as Database['public']['Enums']['activity_type'],
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
        ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(data.date_start)
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
        // Non-critical - chat post failure shouldn't block event creation
      }
    }

    navigate(`/events/${event.id}`, { replace: true })
  }, [user, data, saveAsDraft, createEvent, inviteCollective, navigate])

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
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
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

  return (
    <Page
      header={
        <Header
          title="Create Event"
          back
          onBack={goBack}
        />
      }
      footer={
        <div className="space-y-2">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="ghost" onClick={goBack} className="shrink-0">
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
              {isLastStep ? 'Publish Event' : 'Next'}
            </Button>
          </div>
          {isLastStep && (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                // Pass draft flag directly to avoid stale state from async setSaveAsDraft
                handlePublish(true)
              }}
              loading={createEvent.isPending && saveAsDraft}
            >
              Save as Draft
            </Button>
          )}
        </div>
      }
    >
      {/* Progress bar */}
      <div className="pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-200',
                i <= step ? 'bg-primary-500' : 'bg-white',
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-400">
            {STEPS[step].icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-primary-800">
              Step {step + 1}: {STEPS[step].title}
            </p>
            <p className="text-caption text-primary-400">
              {step + 1} of {STEPS.length}
            </p>
          </div>
        </div>
      </div>

      {/* Step content with slide animation */}
      <div className="pt-4 pb-8 min-h-[400px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={shouldReduceMotion ? undefined : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {stepComponents[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </Page>
  )
}
