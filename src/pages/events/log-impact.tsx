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
    WifiOff,
    RefreshCw,
    AlertTriangle,
    Bird,
    ChevronDown,
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
import { syncSurveyImpact } from '@/lib/survey-impact'
import { useImpactMetricDefs } from '@/hooks/use-impact-metric-defs'
import { useCamera } from '@/hooks/use-camera'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useOffline } from '@/hooks/use-offline'
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
    ConfirmationSheet,
} from '@/components'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
  activityType,
}: {
  species: SpeciesEntry[]
  onChange: (species: SpeciesEntry[]) => void
  activityType?: string
}) {
  const [newName, setNewName] = useState('')

  const addSpecies = useCallback(() => {
    if (!newName.trim()) return
    onChange([...species, { name: newName.trim(), count: 1 }])
    setNewName('')
  }, [newName, species, onChange])

  const updateCount = useCallback(
    (index: number, count: number) => {
      if (count <= 0) {
        onChange(species.filter((_, i) => i !== index))
      } else {
        const updated = [...species]
        updated[index] = { ...updated[index], count }
        onChange(updated)
      }
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
      <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
        <Leaf size={16} className="text-primary-600" />
        {activityType === 'tree_planting' ? 'Species Planted' : 'Species'}
      </h3>

      {species.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-1 text-sm text-neutral-900 truncate">{s.name}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateCount(i, s.count - 1)}
              className="min-w-11 min-h-11 rounded-full bg-white flex items-center justify-center text-neutral-500 hover:bg-neutral-50 cursor-pointer select-none text-sm font-bold active:scale-[0.97] transition-transform duration-150"
              aria-label={`Decrease ${s.name} count`}
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-neutral-900">
              {s.count}
            </span>
            <button
              type="button"
              onClick={() => updateCount(i, s.count + 1)}
              className="min-w-11 min-h-11 rounded-full bg-white flex items-center justify-center text-neutral-500 hover:bg-neutral-50 cursor-pointer select-none text-sm font-bold active:scale-[0.97] transition-transform duration-150"
              aria-label={`Increase ${s.name} count`}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeSpecies(i)}
            className="min-w-11 min-h-11 flex items-center justify-center text-neutral-400 hover:text-error-500 cursor-pointer select-none active:scale-[0.97] transition-transform duration-150"
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
            'placeholder:text-neutral-400',
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
/*  Wildlife sighting entry                                            */
/* ------------------------------------------------------------------ */

export interface WildlifeSighting {
  species_name: string
  scientific_name?: string
  count: number
  confidence: 'certain' | 'probable' | 'possible'
  location_approximate?: boolean
}

const CONFIDENCE_OPTIONS: { value: WildlifeSighting['confidence']; label: string }[] = [
  { value: 'certain', label: 'Certain' },
  { value: 'probable', label: 'Probable' },
  { value: 'possible', label: 'Possible' },
]

function WildlifeSightingTracker({
  sightings,
  onChange,
}: {
  sightings: WildlifeSighting[]
  onChange: (sightings: WildlifeSighting[]) => void
}) {
  const [newName, setNewName] = useState('')

  const addSighting = useCallback(() => {
    if (!newName.trim()) return
    onChange([...sightings, { species_name: newName.trim(), count: 1, confidence: 'probable' }])
    setNewName('')
  }, [newName, sightings, onChange])

  const updateSighting = useCallback(
    (index: number, patch: Partial<WildlifeSighting>) => {
      const updated = [...sightings]
      updated[index] = { ...updated[index], ...patch }
      if (patch.count !== undefined && patch.count <= 0) {
        onChange(sightings.filter((_, i) => i !== index))
      } else {
        onChange(updated)
      }
    },
    [sightings, onChange],
  )

  const removeSighting = useCallback(
    (index: number) => {
      onChange(sightings.filter((_, i) => i !== index))
    },
    [sightings, onChange],
  )

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
        <Bird size={16} className="text-primary-600" />
        Wildlife Sightings
      </h3>

      {sightings.map((s, i) => (
        <div key={i} className="rounded-lg bg-white border border-neutral-100 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-medium text-neutral-900 truncate">{s.species_name}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateSighting(i, { count: s.count - 1 })}
                className="min-w-11 min-h-11 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 cursor-pointer select-none text-sm font-bold active:scale-[0.97] transition-transform duration-150"
                aria-label={`Decrease ${s.species_name} count`}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold text-neutral-900">
                {s.count}
              </span>
              <button
                type="button"
                onClick={() => updateSighting(i, { count: s.count + 1 })}
                className="min-w-11 min-h-11 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 cursor-pointer select-none text-sm font-bold active:scale-[0.97] transition-transform duration-150"
                aria-label={`Increase ${s.species_name} count`}
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeSighting(i)}
              className="min-w-11 min-h-11 flex items-center justify-center text-neutral-400 hover:text-error-500 cursor-pointer select-none active:scale-[0.97] transition-transform duration-150"
              aria-label={`Remove ${s.species_name}`}
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="relative">
              <select
                value={s.confidence}
                onChange={(e) => updateSighting(i, { confidence: e.target.value as WildlifeSighting['confidence'] })}
                className="appearance-none rounded-md bg-neutral-50 pl-2 pr-6 py-1.5 text-xs text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
                aria-label={`Confidence for ${s.species_name}`}
              >
                {CONFIDENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
            <input
              type="text"
              placeholder="Scientific name (optional)"
              value={s.scientific_name ?? ''}
              onChange={(e) => updateSighting(i, { scientific_name: e.target.value || undefined })}
              className={cn(
                'flex-1 rounded-md bg-neutral-50',
                'px-2 py-1.5 text-xs text-neutral-700',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                'placeholder:text-neutral-400',
              )}
            />
            <label className="flex items-center gap-1.5 text-neutral-600 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={s.location_approximate ?? false}
                onChange={(e) => updateSighting(i, { location_approximate: e.target.checked || undefined })}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-400 w-4 h-4"
              />
              Approx. location
            </label>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add species name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSighting()}
          className={cn(
            'flex-1 rounded-lg bg-surface-3',
            'px-3 py-2 text-[16px]',
            'focus:outline-none focus:ring-2 focus:ring-primary-400',
            'placeholder:text-neutral-400',
          )}
        />
        <Button
          variant="secondary"
          size="md"
          icon={<Plus size={16} />}
          onClick={addSighting}
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
  failedUploads,
  onRetry,
  onClearFailed,
  isOffline,
}: {
  photos: string[]
  onAdd: () => void
  onRemove: (index: number) => void
  label: string
  uploading?: boolean
  progress?: number | null
  error?: string | null
  failedUploads?: { blob: Blob; error: string }[]
  onRetry?: (index: number) => void
  onClearFailed?: (index: number) => void
  isOffline?: boolean
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
        <Camera size={16} className="text-neutral-400" />
        {label}
      </h3>

      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning-50 text-warning-700 text-sm">
          <WifiOff size={14} />
          You're offline — photos can't be uploaded right now. Save your other impact data and add photos when you have signal.
        </div>
      )}

      <div className="-mx-4 lg:-mx-6">
      <div className="flex gap-2 overflow-x-auto px-4 lg:px-6 pb-1 scrollbar-none">
        {photos.map((p, i) => (
          <div key={i} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white">
            <img src={p} alt={`Photo ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 min-w-8 min-h-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer select-none active:scale-[0.97] transition-transform duration-150"
              aria-label={`Remove photo ${i + 1}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Failed uploads with retry */}
        {failedUploads?.map((f, i) => (
          <div key={`failed-${i}`} className="relative shrink-0 w-20 h-20 rounded-xl bg-error-50 border border-error-200 flex flex-col items-center justify-center gap-1">
            <AlertTriangle size={16} className="text-error-500" />
            <button
              type="button"
              onClick={() => onRetry?.(i)}
              disabled={uploading || isOffline}
              className="flex items-center gap-1 text-[10px] font-medium text-error-600 hover:text-error-700 cursor-pointer select-none disabled:opacity-50"
              aria-label={`Retry failed upload ${i + 1}`}
            >
              <RefreshCw size={10} />
              Retry
            </button>
            <button
              type="button"
              onClick={() => onClearFailed?.(i)}
              className="absolute top-0.5 right-0.5 min-w-6 min-h-6 rounded-full text-error-400 hover:text-error-600 flex items-center justify-center cursor-pointer select-none"
              aria-label={`Dismiss failed upload ${i + 1}`}
            >
              <X size={10} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAdd}
          disabled={uploading || isOffline}
          className={cn(
            'shrink-0 w-20 h-20 min-h-11 min-w-11 rounded-xl bg-neutral-50',
            'flex flex-col items-center justify-center text-neutral-400',
            'hover:bg-neutral-100 hover:text-neutral-500',
            'cursor-pointer select-none',
            'active:scale-[0.97] transition-transform duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          aria-label="Add photo"
        >
          <Camera size={20} />
          <span className="text-[11px] mt-0.5">{isOffline ? 'Offline' : 'Add'}</span>
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
  const isStaff = profile?.role === 'national_leader' || profile?.role === 'manager' || profile?.role === 'admin'

  const { validKeys, isPlaceholderData: metricDefsPlaceholder } = useImpactMetricDefs()

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Confirmation sheet states (replaces window.confirm which fails in Capacitor WebView)
  const [showLeaveSheet, setShowLeaveSheet] = useState(false)
  const [overwriteInfo, setOverwriteInfo] = useState<{ who: string; when: string } | null>(null)
  const [pendingOverwriteResolve, setPendingOverwriteResolve] = useState<((proceed: boolean) => void) | null>(null)

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
  const [wildlifeSightings, setWildlifeSightings] = useState<WildlifeSighting[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [beforePhotos, setBeforePhotos] = useState<string[]>([])
  const [afterPhotos, setAfterPhotos] = useState<string[]>([])
  const [drawnArea, setDrawnArea] = useState<Record<string, unknown> | null>(null)

  // Camera + upload hooks for each photo section
  const camera = useCamera()
  const eventPhotosUpload = useImageUpload({ bucket: 'event-images', pathPrefix: 'impact' })
  const beforeUpload = useImageUpload({ bucket: 'event-images', pathPrefix: 'before' })
  const afterUpload = useImageUpload({ bucket: 'event-images', pathPrefix: 'after' })
  const { isOffline } = useOffline()

  // Whether any photo upload is in a failed or pending state
  const anyPhotoFailed = eventPhotosUpload.hasFailed || beforeUpload.hasFailed || afterUpload.hasFailed
  const anyPhotoUploading = eventPhotosUpload.uploading || beforeUpload.uploading || afterUpload.uploading

  // Unsaved changes guard
  const isDirty = useMemo(() => {
    if (submitted) return false
    return (
      Object.keys(surveyAnswers).length > 0 ||
      photos.length > 0 ||
      beforePhotos.length > 0 ||
      afterPhotos.length > 0 ||
      species.length > 0 ||
      wildlifeSightings.length > 0 ||
      notes.length > 0 ||
      drawnArea !== null
    )
  }, [submitted, surveyAnswers, photos, beforePhotos, afterPhotos, species, wildlifeSightings, notes, drawnArea])

  // Browser/tab close guard
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Back-button navigation guard (works without data router)
  // Uses in-app BottomSheet instead of window.confirm (which silently fails in Capacitor WebView)
  useEffect(() => {
    if (!isDirty) return
    const handlePopState = () => {
      // Always cancel the navigation first, then ask the user
      window.history.pushState(null, '', window.location.href)
      setShowLeaveSheet(true)
    }
    // Push a dummy state so we can intercept the back button
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isDirty])

  const handleConfirmLeave = useCallback(() => {
    setShowLeaveSheet(false)
    // Navigate back, bypassing the guard by temporarily clearing dirty state
    navigate(-1)
  }, [navigate])

  const handleAddPhoto = async (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    uploader: ReturnType<typeof useImageUpload>,
  ) => {
    if (isOffline) return // blocked by UI, but guard anyway
    const result = await camera.pickFromGallery()
    if (!result) return
    try {
      const uploaded = await uploader.upload(result.blob)
      setter((prev) => [...prev, uploaded.url])
    } catch {
      // error tracked by hook's failedUploads state
    }
  }

  const handleRetryPhoto = async (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    uploader: ReturnType<typeof useImageUpload>,
    failedIndex: number,
  ) => {
    try {
      const uploaded = await uploader.retry(failedIndex)
      setter((prev) => [...prev, uploaded.url])
    } catch {
      // re-failure tracked by hook
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
          if (Array.isArray(cm.wildlife_sightings_detail)) setWildlifeSightings(cm.wildlife_sightings_detail as WildlifeSighting[])
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

  // Computed total est. volunteer hours = duration × checked-in attendees
  const computedHoursTotal = useMemo(() => {
    const duration = parseFloat(eventDurationHours) || 0
    return Math.round(duration * checkedInCount * 10) / 10
  }, [eventDurationHours, checkedInCount])

  const activityType = event?.activity_type

  const handleSubmit = useCallback(async () => {
    if (!eventId || !user || isSubmitting) return
    setIsSubmitting(true)

    try {
    // 0. Race condition guard: re-check if someone else submitted while we were filling out
    // Uses in-app BottomSheet instead of window.confirm (which silently fails in Capacitor WebView)
    if (!existingImpact) {
      const { data: freshImpact } = await supabase
        .from('event_impact')
        .select('logged_by, logged_at, profiles:logged_by(display_name)')
        .eq('event_id', eventId)
        .maybeSingle()
      if (freshImpact) {
        const who = (freshImpact.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Another leader'
        const when = freshImpact.logged_at
          ? new Date(freshImpact.logged_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
          : 'just now'
        const proceed = await new Promise<boolean>((resolve) => {
          setOverwriteInfo({ who, when })
          setPendingOverwriteResolve(() => resolve)
        })
        if (!proceed) {
          setIsSubmitting(false)
          return
        }
      }
    }

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

      // Pass undefined for validKeys when metric defs are still placeholder data,
      // so custom metrics aren't silently dropped before the real defs load.
      await syncSurveyImpact(eventId, surveyQuestions, surveyAnswers as Record<string, Json>, user.id, metricDefsPlaceholder ? undefined : validKeys)
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
      wildlife_sightings_detail: wildlifeSightings.length > 0 ? wildlifeSightings : undefined,
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
    for (const key of ['species', 'wildlife_sightings_detail', 'photos', 'before_photos', 'after_photos', 'drawn_area']) {
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
      // Structured sightings → backward-compatible integer total
      wildlife_sightings: wildlifeSightings.length > 0
        ? wildlifeSightings.reduce((sum, s) => sum + s.count, 0)
        : postSyncImpact?.wildlife_sightings ?? null,
      invasive_weeds_pulled: postSyncImpact?.invasive_weeds_pulled ?? null,
      coastline_cleaned_m: postSyncImpact?.coastline_cleaned_m ?? null,
    })

    // Invalidate survey caches
    queryClient.invalidateQueries({ queryKey: ['survey-response'] })
    queryClient.invalidateQueries({ queryKey: ['pending-surveys'] })

    setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }, [eventId, user, isSubmitting, existingImpact, surveyData, surveyQuestions, surveyAnswers, species, wildlifeSightings, photos, beforePhotos, afterPhotos, drawnArea, logImpact, computedHoursTotal, notes, queryClient, validKeys, metricDefsPlaceholder])

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

          <h2 className="font-heading text-xl font-bold text-neutral-900">
            Impact Logged!
          </h2>
          <p className="text-neutral-500 mt-2 max-w-xs">
            Your event's conservation impact has been recorded. Thank you
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
        <div className="space-y-2">
          {anyPhotoFailed && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error-50 text-error-600 text-sm">
              <AlertTriangle size={14} />
              Some photos failed to upload — retry or dismiss them before submitting.
            </div>
          )}
          {anyPhotoUploading && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 text-sm">
              <RefreshCw size={14} className="animate-spin" />
              Photo upload in progress...
            </div>
          )}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Save size={18} />}
            loading={isSubmitting || logImpact.isPending}
            disabled={!canEdit || isSubmitting || anyPhotoFailed || anyPhotoUploading}
            onClick={handleSubmit}
          >
            {existingImpact ? 'Update Impact' : 'Submit Impact'}
          </Button>
        </div> as React.ReactNode
      }
    >
      <div className="pt-4 pb-8 space-y-6">
        {/* Event header */}
        <div>
          <h2 className="font-heading text-lg font-bold text-neutral-900">
            {event.title}
          </h2>
          <p className="text-caption text-neutral-500 mt-0.5">
            {ACTIVITY_TYPE_LABELS[event.activity_type]} · {checkedInCount} checked in / {event.registration_count} registered
          </p>
          {event.date_end && (
            <p className="text-caption text-neutral-500 mt-0.5">
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

        {/* Est. Volunteer Hours - duration × checked-in attendees */}
        <motion.div variants={fadeUp} className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            Total Volunteer Hours
          </h3>

          <div className="rounded-xl bg-white border border-neutral-100 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-50 shrink-0">
                <Clock size={18} className="text-neutral-400" />
              </span>
              <div className="flex-1 min-w-0">
                <label className="block text-caption text-neutral-500 mb-0.5">
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
                      'px-3 py-2 text-[16px] text-right font-semibold text-neutral-900',
                      'focus:outline-none focus:ring-2 focus:ring-primary-400',
                    )}
                    min="0"
                    step="0.5"
                  />
                  <span className="text-caption text-neutral-500">hours</span>
                </div>
              </div>
            </div>

            {/* Calculation breakdown */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 text-sm">
              <span className="font-semibold text-primary-700">
                {eventDurationHours || '0'} hrs
              </span>
              <span className="text-neutral-500">&times;</span>
              <span className="font-semibold text-primary-700">
                {checkedInCount} checked in
              </span>
              <span className="text-neutral-500">=</span>
              <span className="font-bold text-neutral-900">
                {computedHoursTotal} total volunteer hours
              </span>
            </div>

            {checkedInCount === 0 && (
              <p className="text-caption text-warning-600">
                No attendees checked in yet. Check in attendees on the Event Day page to calculate est. volunteer hours.
              </p>
            )}
          </div>
        </motion.div>

        {/* Survey questions - admin-configured impact fields */}
        {surveyQuestions.length > 0 && (
          <motion.div variants={fadeUp} className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-primary-500" />
              <h3 className="text-sm font-semibold text-neutral-900">
                {surveyData?.title ?? 'Impact Survey'}
              </h3>
            </div>

            <div className="rounded-xl bg-white border border-neutral-100 p-4">
              <SurveyQuestionRenderer
                questions={surveyQuestions}
                answers={surveyAnswers}
                setAnswer={setSurveyAnswer}
                numbered={false}
              />
            </div>
          </motion.div>
        )}

        {/* No survey fallback — leader sections (hours, photos, GPS, notes) still work */}
        {!surveyLoading && surveyQuestions.length === 0 && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 text-neutral-500 text-sm">
            <ClipboardList size={16} />
            No custom impact questions for this event type — fill in the sections below to log your impact.
          </motion.div>
        )}

        {/* Species tracking (for relevant activity types) */}
        <motion.div variants={fadeUp}>
        {(activityType === 'tree_planting' ||
          activityType === 'land_regeneration') && (
          <SpeciesTracker species={species} onChange={setSpecies} activityType={activityType} />
        )}
        </motion.div>

        {/* Wildlife sightings (available for all activity types) */}
        <motion.div variants={fadeUp}>
          <WildlifeSightingTracker sightings={wildlifeSightings} onChange={setWildlifeSightings} />
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
          failedUploads={eventPhotosUpload.failedUploads}
          onRetry={(i) => handleRetryPhoto(setPhotos, eventPhotosUpload, i)}
          onClearFailed={(i) => eventPhotosUpload.clearFailed(i)}
          isOffline={isOffline}
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
            failedUploads={beforeUpload.failedUploads}
            onRetry={(i) => handleRetryPhoto(setBeforePhotos, beforeUpload, i)}
            onClearFailed={(i) => beforeUpload.clearFailed(i)}
            isOffline={isOffline}
          />
          <PhotoUploadSection
            photos={afterPhotos}
            onAdd={() => handleAddPhoto(setAfterPhotos, afterUpload)}
            onRemove={(i) => setAfterPhotos((p) => p.filter((_, idx) => idx !== i))}
            label="After"
            uploading={afterUpload.uploading}
            progress={afterUpload.progress}
            error={afterUpload.error}
            failedUploads={afterUpload.failedUploads}
            onRetry={(i) => handleRetryPhoto(setAfterPhotos, afterUpload, i)}
            onClearFailed={(i) => afterUpload.clearFailed(i)}
            isOffline={isOffline}
          />
        </motion.div>

        {/* GPS area - draw polygon/circle */}
        <motion.div variants={fadeUp} className="rounded-xl bg-white shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-neutral-400" />
            <h3 className="text-sm font-semibold text-neutral-900">
              Area Worked
            </h3>
          </div>
          <Suspense
            fallback={
              <Skeleton className="aspect-[16/10] rounded-lg" />
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

      {/* Leave without saving confirmation (replaces window.confirm) */}
      <ConfirmationSheet
        open={showLeaveSheet}
        onClose={() => setShowLeaveSheet(false)}
        onConfirm={handleConfirmLeave}
        title="Leave without saving?"
        description="You have unsaved impact data that will be lost."
        confirmLabel="Discard changes"
        variant="warning"
      />

      {/* Overwrite existing impact confirmation (replaces window.confirm) */}
      <ConfirmationSheet
        open={!!overwriteInfo}
        onClose={() => {
          pendingOverwriteResolve?.(false)
          setOverwriteInfo(null)
          setPendingOverwriteResolve(null)
        }}
        onConfirm={() => {
          pendingOverwriteResolve?.(true)
          setOverwriteInfo(null)
          setPendingOverwriteResolve(null)
        }}
        title="Impact already logged"
        description={
          overwriteInfo
            ? `${overwriteInfo.who} already logged impact for this event (${overwriteInfo.when}). Replace their submission?`
            : ''
        }
        confirmLabel="Replace"
        variant="warning"
      />
    </Page>
  )
}
