import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  TreePine,
  Trash2,
  Waves,
  Clock,
  Leaf,
  Eye,
  Ruler,
  Camera,
  Plus,
  X,
  MapPin,
  CheckCircle2,
  Save,
  Calendar,
} from 'lucide-react'
import {
  useEventDetail,
  useEventImpact,
  useLogImpact,
  IMPACT_FIELDS_BY_ACTIVITY,
  ACTIVITY_TYPE_LABELS,
  getEventDuration,
} from '@/hooks/use-events'
import type { ImpactField } from '@/hooks/use-events'
import { useCamera } from '@/hooks/use-camera'
import { useImageUpload } from '@/hooks/use-image-upload'
import type { Database } from '@/types/database.types'
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
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'

const LeafletDrawMap = lazy(() => import('@/components/leaflet-draw-map'))

/* ------------------------------------------------------------------ */
/*  Field icon mapping                                                 */
/* ------------------------------------------------------------------ */

const fieldIcons: Record<string, React.ReactNode> = {
  tree: <TreePine size={18} className="text-success-600" />,
  trash: <Trash2 size={18} className="text-error-500" />,
  wave: <Waves size={18} className="text-info-500" />,
  leaf: <Leaf size={18} className="text-primary-500" />,
  eye: <Eye size={18} className="text-warning-500" />,
  area: <Ruler size={18} className="text-plum-500" />,
}

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
              className="min-w-11 min-h-11 rounded-full bg-white flex items-center justify-center text-primary-400 hover:bg-primary-50 cursor-pointer select-none text-sm font-bold active:scale-[0.97] transition-all duration-150"
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
              className="min-w-11 min-h-11 rounded-full bg-white flex items-center justify-center text-primary-400 hover:bg-primary-50 cursor-pointer select-none text-sm font-bold active:scale-[0.97] transition-all duration-150"
              aria-label={`Increase ${s.name} count`}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeSpecies(i)}
            className="min-w-11 min-h-11 flex items-center justify-center text-primary-400 hover:text-error-500 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
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
            'flex-1 rounded-lg bg-primary-50/50',
            'px-3 py-2 text-[16px]',
            'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
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
              className="absolute top-1 right-1 min-w-11 min-h-11 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
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
            'active:scale-[0.97] transition-all duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          aria-label="Add photo"
        >
          <Camera size={20} />
          <span className="text-[10px] mt-0.5">Add</span>
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

  const { data: event, isLoading: eventLoading } = useEventDetail(eventId)
  const { data: existingImpact, isLoading: impactLoading } = useEventImpact(eventId)
  const logImpact = useLogImpact()

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  const [submitted, setSubmitted] = useState(false)

  // Form state - numbers stored as strings for input handling
  const [formValues, setFormValues] = useState<Record<string, string>>({
    trees_planted: '0',
    rubbish_kg: '0',
    coastline_cleaned_m: '0',
    hours_total: '0',
    area_restored_sqm: '0',
    native_plants: '0',
    wildlife_sightings: '0',
  })
  const [notes, setNotes] = useState('')
  const [species, setSpecies] = useState<SpeciesEntry[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [beforePhotos, setBeforePhotos] = useState<string[]>([])
  const [afterPhotos, setAfterPhotos] = useState<string[]>([])

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

  // Pre-populate from existing impact data
  useEffect(() => {
    if (existingImpact) {
      setFormValues({
        trees_planted: String(existingImpact.trees_planted),
        rubbish_kg: String(existingImpact.rubbish_kg),
        coastline_cleaned_m: String(existingImpact.coastline_cleaned_m),
        hours_total: String(existingImpact.hours_total),
        area_restored_sqm: String(existingImpact.area_restored_sqm),
        native_plants: String(existingImpact.native_plants),
        wildlife_sightings: String(existingImpact.wildlife_sightings),
      })
      setNotes(existingImpact.notes ?? '')
    }
  }, [existingImpact])

  // Auto-calculate hours if we have event duration and attendee count
  useEffect(() => {
    if (event && event.date_end && event.registration_count > 0) {
      const durationHours =
        (new Date(event.date_end).getTime() - new Date(event.date_start).getTime()) /
        (1000 * 60 * 60)
      const totalHours = Math.round(durationHours * event.registration_count * 10) / 10
      setFormValues((prev) => ({
        ...prev,
        hours_total: String(totalHours),
      }))
    }
  }, [event])

  const activityType = event?.activity_type as Database['public']['Enums']['activity_type'] | undefined
  const impactFields = activityType ? IMPACT_FIELDS_BY_ACTIVITY[activityType] : []

  // Always show hours_total
  const allFields: ImpactField[] = useMemo(() => {
    const base: ImpactField[] = [
      { key: 'hours_total', label: 'Total Volunteer Hours', unit: 'hours', icon: 'clock' },
    ]
    const extra = impactFields.filter((f) => f.key !== 'hours_total')
    return [...base, ...extra]
  }, [impactFields])

  const handleSubmit = useCallback(async () => {
    if (!eventId) return

    await logImpact.mutateAsync({
      event_id: eventId,
      trees_planted: parseFloat(formValues.trees_planted) || 0,
      rubbish_kg: parseFloat(formValues.rubbish_kg) || 0,
      coastline_cleaned_m: parseFloat(formValues.coastline_cleaned_m) || 0,
      hours_total: parseFloat(formValues.hours_total) || 0,
      area_restored_sqm: parseFloat(formValues.area_restored_sqm) || 0,
      native_plants: parseFloat(formValues.native_plants) || 0,
      wildlife_sightings: parseFloat(formValues.wildlife_sightings) || 0,
      notes: notes || null,
      custom_metrics: {
        species: species.length > 0 ? species : undefined,
        photos: photos.length > 0 ? photos : undefined,
        before_photos: beforePhotos.length > 0 ? beforePhotos : undefined,
        after_photos: afterPhotos.length > 0 ? afterPhotos : undefined,
      } as any,
    })

    setSubmitted(true)
  }, [eventId, formValues, notes, species, logImpact])

  const isLoading = eventLoading || impactLoading

  if (isLoading) {
    return (
      <Page header={<Header title="Log Impact" back />}>
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
      <Page header={<Header title="Log Impact" back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="Could not find this event."
          action={{ label: 'Go Back', onClick: () => navigate(-1) }}
        />
      </Page>
    )
  }

  // Success state
  if (submitted) {
    return (
      <Page header={<Header title="Log Impact" back />}>
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
                  to: '/impact',
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
      header={<Header title="Log Impact" back />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Save size={18} />}
          loading={logImpact.isPending}
          onClick={handleSubmit}
        >
          {existingImpact ? 'Update Impact' : 'Submit Impact'}
        </Button>
      }
    >
      <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="pt-4 pb-8 space-y-6">
        {/* Event header */}
        <motion.div variants={fadeUp}>
          <h2 className="font-heading text-lg font-bold text-primary-800">
            {event.title}
          </h2>
          <p className="text-caption text-primary-400 mt-0.5">
            {ACTIVITY_TYPE_LABELS[event.activity_type]} · {event.registration_count} attendees
          </p>
          {event.date_end && (
            <p className="text-caption text-primary-400 mt-0.5">
              Duration: {getEventDuration(event.date_start, event.date_end)}
            </p>
          )}
        </motion.div>

        {existingImpact && (
          <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning-50 text-warning-700 text-sm">
            <Clock size={16} />
            Editing existing impact data. You can update within 48 hours.
          </motion.div>
        )}

        {/* Impact metric fields */}
        <motion.div variants={fadeUp} className="space-y-4">
          <h3 className="text-sm font-semibold text-primary-800">
            Impact Metrics
          </h3>

          {allFields.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white shrink-0">
                {field.icon === 'clock' ? <Clock size={18} className="text-primary-400" /> : fieldIcons[field.icon] ?? <Ruler size={18} className="text-primary-400" />}
              </span>
              <div className="flex-1 min-w-0">
                <label className="block text-caption text-primary-400 mb-0.5">
                  {field.label}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formValues[field.key] ?? '0'}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className={cn(
                      'w-24 rounded-lg bg-primary-50/50',
                      'px-3 py-2 text-[16px] text-right font-semibold text-primary-800',
                      'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white',
                    )}
                    min="0"
                    step="any"
                  />
                  <span className="text-caption text-primary-400">{field.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Species tracking (for relevant activity types) */}
        <motion.div variants={fadeUp}>
        {(activityType === 'tree_planting' ||
          activityType === 'habitat_restoration' ||
          activityType === 'community_garden' ||
          activityType === 'seed_collecting') && (
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
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
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
            <LeafletDrawMap
              center={parseLocationPoint(event.location_point) ?? undefined}
              zoom={15}
              aria-label="Draw the area you worked on"
              className="aspect-[16/10] rounded-lg"
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
      </motion.div>
    </Page>
  )
}
