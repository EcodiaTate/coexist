import { useState, useCallback, useMemo, useEffect, lazy, Suspense, startTransition } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  TreePine,
  Clock,
  Leaf,
  Camera,
  Plus,
  X,
  MapPin,
  CheckCircle2,
  Save,
  Calendar,
  ClipboardList,
} from 'lucide-react'
import {
  useEventDetail,
  useEventImpact,
  useEventAttendees,
  useLogImpact,
  ACTIVITY_TYPE_LABELS,
  getEventDuration,
} from '@/hooks/use-events'
import { useCollectiveRole } from '@/hooks/use-collective-role'
import { useAuth } from '@/hooks/use-auth'
import { useEventSurvey } from '@/hooks/use-event-survey'
import { SurveyQuestionRenderer } from '@/components/survey-questions'
import type { SurveyQuestion } from '@/components/survey-questions'
import { syncSurveyImpact } from '@/lib/survey-impact'
import { useCamera } from '@/hooks/use-camera'
import { useImageUpload } from '@/hooks/use-image-upload'
import type { Json } from '@/types/database.types'
import {
  Page,
  Header,
  Button,
  Input,
  Skeleton,
  EmptyState,
  UploadProgress,
  WhatsNext,
} from '@/components'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const MapView = lazy(() => import('@/components/map/map-view').then(m => ({ default: m.MapView })))

/* ------------------------------------------------------------------ */
/*  Species entry                                                      */
/* ------------------------------------------------------------------ */

interface SpeciesEntry {
  name: string
  count: number
}

function SpeciesTracker({
  species,
  onChange,
}: {
  species: SpeciesEntry[]
  onChange: (species: SpeciesEntry[]) => void
}) {
  const [newName, setNewName] = useState('')

  const addSpecies = useCallback(() => {
    if (!newName.trim()) return
    onChange([...species, { name: newName.trim(), count: 1 }])
    setNewName('')
  }, [newName, species, onChange])

  const updateCount = useCallback(
    (index: number, count: number) => {
      const updated = [...species]
      updated[index] = { ...updated[index], count: Math.max(0, count) }
      onChange(updated)
    },
    [species, onChange],
  )

  const removeSpecies = useCallback(
    (index: number) => {
      onChange(species.filter((_, i) => i !== index))
    },
    [species, onChange],
  )

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
        <Leaf size={16} className="text-primary-600" />
        Species Planted
      </h3>

      {species.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-1 text-sm text-primary-800 truncate">{s.name}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateCount(i, s.count - 1)}
              className="min-w-11 min-h-11 rounded-full bg-white flex items-center justify-center text-primary-400 hover:bg-primary-50 cursor-pointer select-none text-sm font-bold active:scale-[0.97] transition-transform duration-150"
              aria-label={`Decrease ${s.name} count`}
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-primary-800">
              {s.count}
            </span>
            <button
              type="button"
              onClick={() => updateCount(i, s.count + 1)}
              className="min-w-11 min-h-11 rounded-full bg-white flex items-center justify-center text-primary-400 hover:bg-primary-50 cursor-pointer select-none text-sm font-bold active:scale-[0.97] transition-transform duration-150"
              aria-label={`Increase ${s.name} count`}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeSpecies(i)}
            className="min-w-11 min-h-11 flex items-center justify-center text-primary-400 hover:text-error-500 cursor-pointer select-none active:scale-[0.97] transition-transform duration-150"
            aria-label={`Remove ${s.name}`}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add species name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSpecies()}
          className={cn(
            'flex-1 rounded-lg bg-surface-3',
            'px-3 py-2 text-[16px]',
            'focus:outline-none focus:ring-2 focus:ring-primary-400',
            'placeholder:text-primary-400',
          )}
        />
        <Button
          variant="secondary"
          size="md"
          icon={<Plus size={16} />}
          onClick={addSpecies}
          disabled={!newName.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Photo section                                                      */
/* ------------------------------------------------------------------ */

function PhotoUploadSection({
  photos,
  onAdd,
  onRemove,
  label,
  uploading,
  progress,
  error,
}: {
  photos: string[]
  onAdd: () => void
  onRemove: (index: number) => void
  label: string
  uploading?: boolean
  progress?: number | null
  error?: string | null
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
        <Camera size={16} className="text-primary-400" />
        {label}
      </h3>

      <div className="-mx-4 lg:-mx-6">
      <div className="flex gap-2 overflow-x-auto px-4 lg:px-6 pb-1 scrollbar-none">
        {photos.map((p, i) => (
          <div key={i} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white">
            <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 min-w-11 min-h-11 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer select-none active:scale-[0.97] transition-transform duration-150"
              aria-label={`Remove photo ${i + 1}`}
            >
              <X size={10} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          disabled={uploading}
          className={cn(
            'shrink-0 w-20 h-20 min-h-11 min-w-11 rounded-xl bg-primary-50/60',
            'flex flex-col items-center justify-center text-primary-400',
            'hover:bg-primary-100 hover:text-primary-500',
            'cursor-pointer select-none',
            'active:scale-[0.97] transition-transform duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          aria-label="Add photo"
        >
          <Camera size={20} />
          <span className="text-[11px] mt-0.5">Add</span>
        </button>
      </div>
      </div>

      <UploadProgress
        progress={progress ?? null}
        uploading={uploading}
        error={error}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function LogImpactPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const queryClient = useQueryClient()

  const { user, profile } = useAuth()
  const { data: event, isLoading: eventLoading } = useEventDetail(eventId)
  const { data: existingImpact, isLoading: impactLoading } = useEventImpact(eventId)
  const { data: attendees } = useEventAttendees(eventId)
  const logImpact = useLogImpact()
  const { isAssistLeader, isLoading: roleLoading } = useCollectiveRole(event?.collective_id)
  const isStaff = profile?.role === 'national_staff' || profile?.role === 'national_admin' || profile?.role === 'super_admin'

  // Load admin-created survey for this event's activity type
  const { data: surveyData, isLoading: surveyLoading } = useEventSurvey(eventId, event?.activity_type)
  const surveyQuestions = surveyData?.questions ?? []

  // Load existing survey response (for edit pre-fill)
  const { data: existingSurveyResponse } = useQuery({
    queryKey: ['survey-response-leader', surveyData?.surveyId, eventId, user?.id],
    queryFn: async () => {
      if (!surveyData?.surveyId || !eventId || !user) return null
      const { data } = await supabase
        .from('survey_responses')
        .select('answers')
        .eq('survey_id', surveyData.surveyId)
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()
      return (data?.answers as Record<string, unknown>) ?? null
    },
    enabled: !!surveyData?.surveyId && !!eventId && !!user,
    staleTime: 5 * 60 * 1000,
  })

  const stagger: import('framer-motion').Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp: import('framer-motion').Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  const [submitted, setSubmitted] = useState(false)

  // 48h edit window enforcement
  const { isEditWindowExpired, hoursRemaining: editHoursRemaining } = useMemo(() => {
    if (!existingImpact) return { isEditWindowExpired: false, hoursRemaining: 48 }
    const loggedAt = new Date(existingImpact.logged_at ?? Date.now()).getTime()
    const hoursSince = (Date.now() - loggedAt) / (1000 * 60 * 60)
    return {
      isEditWindowExpired: hoursSince >= 48,
      hoursRemaining: Math.max(0, Math.ceil(48 - hoursSince)),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when existingImpact changes
  }, [existingImpact?.logged_at])
  const canEdit = !isEditWindowExpired || isStaff

  // Survey answers state
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, unknown>>({})
  const setSurveyAnswer = useCallback((id: string, value: unknown) => {
    setSurveyAnswers((prev) => ({ ...prev, [id]: value }))
  }, [])

  // Pre-fill survey answers from existing response
  useEffect(() => {
    if (existingSurveyResponse && Object.keys(surveyAnswers).length === 0) {
      startTransition(() => setSurveyAnswers(existingSurveyResponse))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSurveyResponse])

  // Leader sections state
  const [eventDurationHours, setEventDurationHours] = useState('')
  const [notes, setNotes] = useState('')
  const [species, setSpecies] = useState<SpeciesEntry[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [beforePhotos, setBeforePhotos] = useState<string[]>([])
  const [afterPhotos, setAfterPhotos] = useState<string[]>([])
  const [drawnArea, setDrawnArea] = useState<Record<string, unknown> | null>(null)

  // Camera + upload hooks for each photo section
  const camera = useCamera()
  const eventPhotosUpload = useImageUpload({ bucket: 'event-images', pathPrefix: 'impact' })
  const beforeUpload = useImageUpload({ bucket: 'event-images', pathPrefix: 'before' })
  const afterUpload = useImageUpload({ bucket: 'event-images', pathPrefix: 'after' })

  const handleAddPhoto = async (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    uploader: ReturnType<typeof useImageUpload>,
  ) => {
    const result = await camera.pickFromGallery()
    if (!result) return
    try {
      const uploaded = await uploader.upload(result.blob)
      setter((prev) => [...prev, uploaded.url])
    } catch {
      // error handled by hook
    }
  }

  // Checked-in attendee count (status === 'attended')
  const checkedInCount = useMemo(
    () => (attendees ?? []).filter((a) => a.status === 'attended').length,
    [attendees],
  )

  // Pre-populate leader sections from existing impact data
  useEffect(() => {
    if (existingImpact) {
      startTransition(() => {
        setNotes(existingImpact.notes ?? '')
        const cm = existingImpact.custom_metrics as Record<string, unknown> | null
        if (cm) {
          if (Array.isArray(cm.species)) setSpecies(cm.species as SpeciesEntry[])
          if (Array.isArray(cm.photos)) setPhotos(cm.photos as string[])
          if (Array.isArray(cm.before_photos)) setBeforePhotos(cm.before_photos as string[])
          if (Array.isArray(cm.after_photos)) setAfterPhotos(cm.after_photos as string[])
          if (cm.drawn_area && typeof cm.drawn_area === 'object') setDrawnArea(cm.drawn_area as Record<string, unknown>)
        }
        // Back-calculate duration from stored hours_total
        if (existingImpact.hours_total && checkedInCount > 0) {
          setEventDurationHours(String(Math.round((existingImpact.hours_total / checkedInCount) * 10) / 10))
        }
      })
    }
  }, [existingImpact, checkedInCount])

  // Auto-calculate duration from event start/end times
  useEffect(() => {
    if (event?.date_end && !existingImpact) {
      startTransition(() => {
        const durationHours =
          (new Date(event.date_end!).getTime() - new Date(event.date_start).getTime()) /
          (1000 * 60 * 60)
        setEventDurationHours(String(Math.round(durationHours * 10) / 10))
      })
    }
  }, [event, existingImpact])

  // Computed total volunteer hours = duration × checked-in attendees
  const computedHoursTotal = useMemo(() => {
    const duration = parseFloat(eventDurationHours) || 0
    return Math.round(duration * checkedInCount * 10) / 10
  }, [eventDurationHours, checkedInCount])

  const activityType = event?.activity_type

  const handleSubmit = useCallback(async () => {
    if (!eventId || !user) return

    // 1. Save survey response + sync impact-tagged answers
    if (surveyData?.surveyId && surveyQuestions.length > 0) {
      await supabase
        .from('survey_responses')
        .upsert(
          {
            survey_id: surveyData.surveyId,
            event_id: eventId,
            user_id: user.id,
            answers: surveyAnswers as unknown as Json,
          },
          { onConflict: 'survey_responses_unique_response' },
        )

      await syncSurveyImpact(eventId, surveyQuestions, surveyAnswers as Record<string, Json>, user.id)
    }

    // 2. Save leader sections (hours, photos, species, GPS, notes)
    //    Read the impact row now so we preserve any builtin values that syncSurveyImpact
    //    just wrote. The upsert must not zero those out.
    const { data: postSyncImpact } = await supabase
      .from('event_impact')
      .select('trees_planted, rubbish_kg, area_restored_sqm, native_plants, wildlife_sightings, invasive_weeds_pulled, coastline_cleaned_m, custom_metrics')
      .eq('event_id', eventId)
      .maybeSingle()

    // Always write leader-section keys so that clearing a field (e.g. deleting all
    // photos) actually removes it rather than leaving the old value in place.
    const customMetricsPayload: Record<string, unknown> = {
      species: species.length > 0 ? species : undefined,
      photos: photos.length > 0 ? photos : undefined,
      before_photos: beforePhotos.length > 0 ? beforePhotos : undefined,
      after_photos: afterPhotos.length > 0 ? afterPhotos : undefined,
      drawn_area: drawnArea ?? undefined,
    }
    // Strip undefined keys so we only merge explicitly-set values
    const leaderSections = Object.fromEntries(
      Object.entries(customMetricsPayload).filter(([, v]) => v !== undefined),
    )

    // Merge custom_metrics: strip stale leader-section keys from the existing row,
    // then layer in the current leader sections. This ensures a cleared field
    // (e.g. all photos deleted) actually disappears rather than re-appearing.
    const existingCm = { ...(postSyncImpact?.custom_metrics as Record<string, unknown>) ?? {} }
    for (const key of ['species', 'photos', 'before_photos', 'after_photos', 'drawn_area']) {
      delete existingCm[key]
    }
    const mergedCustom = { ...existingCm, ...leaderSections }

    await logImpact.mutateAsync({
      event_id: eventId,
      hours_total: computedHoursTotal,
      notes: notes || null,
      custom_metrics: mergedCustom as unknown as Json,
      // Preserve builtin values written by syncSurveyImpact; null means not measured
      trees_planted: postSyncImpact?.trees_planted ?? null,
      rubbish_kg: postSyncImpact?.rubbish_kg ?? null,
      area_restored_sqm: postSyncImpact?.area_restored_sqm ?? null,
      native_plants: postSyncImpact?.native_plants ?? null,
      wildlife_sightings: postSyncImpact?.wildlife_sightings ?? null,
      invasive_weeds_pulled: postSyncImpact?.invasive_weeds_pulled ?? null,
      coastline_cleaned_m: postSyncImpact?.coastline_cleaned_m ?? null,
    })

    // Invalidate survey caches
    queryClient.invalidateQueries({ queryKey: ['survey-response'] })
    queryClient.invalidateQueries({ queryKey: ['pending-surveys'] })

    setSubmitted(true)
  }, [eventId, user, surveyData, surveyQuestions, surveyAnswers, species, photos, beforePhotos, afterPhotos, drawnArea, existingImpact, logImpact, computedHoursTotal, notes, queryClient])

  const isLoading = eventLoading || impactLoading || roleLoading || surveyLoading
  const showLoading = useDelayedLoading(isLoading)

  if (showLoading) {
    return (
      <Page swipeBack header={<Header title="Log Impact" back />}>
        <div className="pt-4 space-y-4">
          <Skeleton variant="title" />
          <Skeleton variant="text" count={3} />
          <Skeleton variant="card" />
        </div>
      </Page>
    )
  }
  if (!event) {
    return (
      <Page swipeBack header={<Header title="Log Impact" back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="Could not find this event."
          action={{ label: 'Go Back', onClick: () => navigate(-1) }}
        />
      </Page>
    )
  }

  // Role gate: only assist-leaders+ and national staff can log impact
  if (!isAssistLeader && !isStaff) {
    return (
      <Page swipeBack header={<Header title="Log Impact" back />}>
        <EmptyState
          illustration="error"
          title="Leader access only"
          description="Impact logging is available to event leaders and assist-leaders."
          action={{ label: 'View Event', onClick: () => navigate(`/events/${eventId}`) }}
        />
      </Page>
    )
  }

  // Success state
  if (submitted) {
    return (
      <Page swipeBack header={<Header title="Log Impact" back />}>
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
        >
          <motion.div
            initial={shouldReduceMotion ? undefined : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mb-4"
          >
            <CheckCircle2 size={32} className="text-success-600" />
          </motion.div>

          <h2 className="font-heading text-xl font-bold text-primary-800">
            Impact Logged!
          </h2>
          <p className="text-primary-400 mt-2 max-w-xs">
            The impact has been distributed to all attendees' profiles. Thank you
            for making a difference.
          </p>

          <div className="mt-6 w-full max-w-xs">
            <WhatsNext
              suggestions={[
                {
                  label: 'View Event',
                  description: 'See the completed event details',
                  icon: <CheckCircle2 size={18} />,
                  to: `/events/${event.id}`,
                },
                {
                  label: 'View Impact Dashboard',
                  description: 'See your collective impact grow',
                  icon: <TreePine size={18} />,
                  to: '/profile',
                },
                {
                  label: 'My Events',
                  description: 'Browse your upcoming events',
                  icon: <Calendar size={18} />,
                  to: '/events',
                },
              ]}
            />
          </div>
        </motion.div>
      </Page>
    )
  }

  return (
    <Page
      swipeBack
      header={<Header title="Log Impact" back />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Save size={18} />}
          loading={logImpact.isPending}
          disabled={!canEdit}
          onClick={handleSubmit}
        >
          {existingImpact ? 'Update Impact' : 'Submit Impact'}
        </Button> as React.ReactNode
      }
    >
      <div className="pt-4 pb-8 space-y-6">
        {/* Event header */}
        <div>
          <h2 className="font-heading text-lg font-bold text-primary-800">
            {event.title}
          </h2>
          <p className="text-caption text-primary-400 mt-0.5">
            {ACTIVITY_TYPE_LABELS[event.activity_type]} · {checkedInCount} checked in / {event.registration_count} registered
          </p>
          {event.date_end && (
            <p className="text-caption text-primary-400 mt-0.5">
              Duration: {getEventDuration(event.date_start, event.date_end)}
            </p>
          )}
        </div>

        {existingImpact && isEditWindowExpired && !isStaff && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error-50 text-error-700 text-sm">
            <Clock size={16} />
            The 48-hour edit window has passed. Contact a national admin to make changes.
          </motion.div>
        )}
        {existingImpact && !isEditWindowExpired && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning-50 text-warning-700 text-sm">
            <Clock size={16} />
            Editing existing impact data. {editHoursRemaining} hours remaining to update.
          </motion.div>
        )}

        {/* Volunteer Hours - duration × checked-in attendees */}
        <motion.div variants={fadeUp} className="space-y-3">
          <h3 className="text-sm font-semibold text-primary-800">
            Volunteer Hours
          </h3>

          <div className="rounded-xl bg-white border border-primary-100/40 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-50 shrink-0">
                <Clock size={18} className="text-primary-400" />
              </span>
              <div className="flex-1 min-w-0">
                <label className="block text-caption text-primary-400 mb-0.5">
                  How long was the event?
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={eventDurationHours}
                    onChange={(e) => setEventDurationHours(e.target.value)}
                    placeholder="0"
                    className={cn(
                      'w-24 rounded-lg bg-surface-3',
                      'px-3 py-2 text-[16px] text-right font-semibold text-primary-800',
                      'focus:outline-none focus:ring-2 focus:ring-primary-400',
                    )}
                    min="0"
                    step="0.5"
                  />
                  <span className="text-caption text-primary-400">hours</span>
                </div>
              </div>
            </div>

            {/* Calculation breakdown */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50/60 text-sm">
              <span className="font-semibold text-primary-700">
                {eventDurationHours || '0'} hrs
              </span>
              <span className="text-primary-400">&times;</span>
              <span className="font-semibold text-primary-700">
                {checkedInCount} checked in
              </span>
              <span className="text-primary-400">=</span>
              <span className="font-bold text-primary-800">
                {computedHoursTotal} volunteer hours
              </span>
            </div>

            {checkedInCount === 0 && (
              <p className="text-caption text-warning-600">
                No attendees checked in yet. Check in attendees on the Event Day page to calculate volunteer hours.
              </p>
            )}
          </div>
        </motion.div>

        {/* Survey questions — admin-configured impact fields */}
        {surveyQuestions.length > 0 && (
          <motion.div variants={fadeUp} className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-primary-500" />
              <h3 className="text-sm font-semibold text-primary-800">
                {surveyData?.title ?? 'Impact Survey'}
              </h3>
            </div>

            <div className="rounded-xl bg-white border border-primary-100/40 p-4">
              <SurveyQuestionRenderer
                questions={surveyQuestions}
                answers={surveyAnswers}
                setAnswer={setSurveyAnswer}
                numbered={false}
              />
            </div>
          </motion.div>
        )}

        {/* No survey fallback info */}
        {!surveyLoading && surveyQuestions.length === 0 && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50/60 text-primary-500 text-sm">
            <ClipboardList size={16} />
            No impact survey configured for this event type. Ask an admin to create one under Surveys.
          </motion.div>
        )}

        {/* Species tracking (for relevant activity types) */}
        <motion.div variants={fadeUp}>
        {(activityType === 'tree_planting' ||
          activityType === 'land_regeneration') && (
          <SpeciesTracker species={species} onChange={setSpecies} />
        )}
        </motion.div>

        {/* Photo uploads */}
        <motion.div variants={fadeUp}>
        <PhotoUploadSection
          photos={photos}
          onAdd={() => handleAddPhoto(setPhotos, eventPhotosUpload)}
          onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))}
          label="Event Photos"
          uploading={eventPhotosUpload.uploading}
          progress={eventPhotosUpload.progress}
          error={eventPhotosUpload.error}
        />
        </motion.div>

        {/* Before/After photos */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PhotoUploadSection
            photos={beforePhotos}
            onAdd={() => handleAddPhoto(setBeforePhotos, beforeUpload)}
            onRemove={(i) => setBeforePhotos((p) => p.filter((_, idx) => idx !== i))}
            label="Before"
            uploading={beforeUpload.uploading}
            progress={beforeUpload.progress}
            error={beforeUpload.error}
          />
          <PhotoUploadSection
            photos={afterPhotos}
            onAdd={() => handleAddPhoto(setAfterPhotos, afterUpload)}
            onRemove={(i) => setAfterPhotos((p) => p.filter((_, idx) => idx !== i))}
            label="After"
            uploading={afterUpload.uploading}
            progress={afterUpload.progress}
            error={afterUpload.error}
          />
        </motion.div>

        {/* GPS area - draw polygon/circle */}
        <motion.div variants={fadeUp} className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-primary-400" />
            <h3 className="text-sm font-semibold text-primary-800">
              Area Worked
            </h3>
          </div>
          <Suspense
            fallback={
              <div className="aspect-[16/10] rounded-lg bg-white animate-pulse flex items-center justify-center text-primary-400">
                <span className="text-sm">Loading map...</span>
              </div>
            }
          >
            <MapView
              mode="draw"
              center={parseLocationPoint(event.location_point) ?? undefined}
              zoom={15}
              aria-label="Draw the area you worked on"
              className="aspect-[16/10] rounded-lg"
              onAreaChange={(geojson) => setDrawnArea(geojson as Record<string, unknown> | null)}
            />
          </Suspense>
        </motion.div>

        {/* Notes */}
        <motion.div variants={fadeUp}>
        <Input
          type="textarea"
          label="Notes"
          placeholder="Any observations, challenges, or highlights from the event..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
        </motion.div>
      </div>
    </Page>
  )
}
