import { useState, useCallback, useEffect, startTransition } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  MapPin,
  Image,
  Camera,
  Save,
  X,
} from 'lucide-react'
import {
  useEventDetail,
  useUpdateEvent,
  ACTIVITY_TYPE_OPTIONS,
} from '@/hooks/use-events'
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
  Skeleton,
  EmptyState,
  MapView,
  UploadProgress,
} from '@/components'
import type { MapCenter } from '@/components'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'

type ActivityType = Database['public']['Enums']['activity_type']

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function EditEventPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  const { data: event, isLoading } = useEventDetail(eventId)
  const showLoading = useDelayedLoading(isLoading)
  const updateEvent = useUpdateEvent()

  const { pickFromGallery, loading: cameraLoading } = useCamera()
  const { upload, progress, uploading, error: uploadError } = useImageUpload({
    bucket: 'event-images',
    pathPrefix: 'covers',
  })

  // Form state
  const [title, setTitle] = useState('')
  const [activityType, setActivityType] = useState<ActivityType | ''>('')
  const [description, setDescription] = useState('')
  const [dateStart, setDateStart] = useState<Date | null>(null)
  const [dateEnd, setDateEnd] = useState<Date | null>(null)
  const [address, setAddress] = useState('')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [capacity, setCapacity] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Pre-populate from event data
  useEffect(() => {
    if (event && !initialized) {
      startTransition(() => {
        setTitle(event.title)
        setActivityType(event.activity_type)
        setDescription(event.description ?? '')
        setDateStart(new Date(event.date_start))
        setDateEnd(event.date_end ? new Date(event.date_end) : null)
        setAddress(event.address ?? '')
        const pos = parseLocationPoint(event.location_point)
        if (pos) {
          setLocationLat(pos.lat)
          setLocationLng(pos.lng)
        }
        setCapacity(event.capacity ? String(event.capacity) : '')
        setCoverImageUrl(event.cover_image_url ?? '')
        setIsPublic(event.is_public)
        setInitialized(true)
      })
    }
  }, [event, initialized])

  const handleUpload = async () => {
    const result = await pickFromGallery()
    if (!result) return
    try {
      const uploaded = await upload(result.blob)
      setCoverImageUrl(uploaded.url)
    } catch {
      // error handled by hook
    }
  }

  const handleSave = useCallback(async () => {
    if (!eventId || !title.trim() || !activityType || !dateStart) return

    const capacityNum = capacity ? parseInt(capacity, 10) : null

    await updateEvent.mutateAsync({
      eventId,
      title,
      description: description || null,
      activity_type: activityType as ActivityType,
      date_start: dateStart.toISOString(),
      date_end: dateEnd?.toISOString() ?? null,
      address: address || null,
      capacity: capacityNum && capacityNum > 0 ? capacityNum : null,
      cover_image_url: coverImageUrl || null,
      is_public: isPublic,
    })

    navigate(`/events/${eventId}`, { replace: true })
  }, [eventId, title, description, activityType, dateStart, dateEnd, address, capacity, coverImageUrl, isPublic, updateEvent, navigate])

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  if (showLoading) {
    return (
      <Page header={<Header title="Edit Event" back />}>
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
      <Page header={<Header title="Edit Event" back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="This event may have been removed."
          action={{ label: 'Go Back', onClick: () => navigate(-1) }}
        />
      </Page>
    )
  }

  const canSave = title.trim().length > 0 && activityType !== '' && dateStart !== null

  return (
    <Page
      header={<Header title="Edit Event" back />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Save size={18} />}
          loading={updateEvent.isPending}
          disabled={!canSave}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      }
    >
      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="pt-4 pb-8 space-y-6"
      >
        {/* Basics */}
        <motion.div variants={fadeUp} className="space-y-4">
          <h3 className="text-sm font-semibold text-primary-800">Basics</h3>
          <Input
            label="Event Title"
            placeholder="e.g. Byron Bay Dune Planting Day"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Dropdown
            label="Activity Type"
            placeholder="Select activity type"
            value={activityType || undefined}
            onChange={(v) => setActivityType(v as ActivityType)}
            options={ACTIVITY_TYPE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <Input
            type="textarea"
            label="Description"
            placeholder="Tell people what this event is about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </motion.div>

        {/* Date & Time */}
        <motion.div variants={fadeUp} className="space-y-4">
          <h3 className="text-sm font-semibold text-primary-800">Date & Time</h3>
          <DatePicker
            label="Start Date & Time"
            value={dateStart}
            onChange={(d) => setDateStart(d)}
            mode="datetime"
          />
          <DatePicker
            label="End Date & Time"
            value={dateEnd}
            onChange={(d) => setDateEnd(d)}
            mode="datetime"
            min={dateStart ?? undefined}
          />
        </motion.div>

        {/* Location */}
        <motion.div variants={fadeUp} className="space-y-4">
          <h3 className="text-sm font-semibold text-primary-800">Location</h3>
          <Input
            label="Address"
            placeholder="Search for an address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            icon={<MapPin size={18} />}
          />
          <MapView
            center={
              locationLat != null && locationLng != null
                ? { lat: locationLat, lng: locationLng }
                : { lat: -33.8688, lng: 151.2093 }
            }
            zoom={13}
            draggable
            onDragEnd={(pos: MapCenter) => {
              setLocationLat(pos.lat)
              setLocationLng(pos.lng)
            }}
            aria-label="Drag the pin to update event location"
            className="aspect-[16/10] rounded-xl shadow-sm"
          />
        </motion.div>

        {/* Details */}
        <motion.div variants={fadeUp} className="space-y-4">
          <h3 className="text-sm font-semibold text-primary-800">Details</h3>
          <Input
            label="Capacity"
            placeholder="Max participants (leave empty for unlimited)"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <Toggle
            label="Public Event"
            description="Anyone can discover and register for this event"
            checked={isPublic}
            onChange={setIsPublic}
          />
        </motion.div>

        {/* Cover Image */}
        <motion.div variants={fadeUp} className="space-y-3">
          <h3 className="text-sm font-semibold text-primary-800">Cover Image</h3>
          {coverImageUrl ? (
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={coverImageUrl}
                alt="Cover preview"
                className="w-full object-cover"
                style={{ aspectRatio: '16/9' }}
              />
              <button
                type="button"
                onClick={() => setCoverImageUrl('')}
                className="absolute top-2 right-2 min-w-11 min-h-11 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
                aria-label="Remove cover image"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUpload}
              disabled={cameraLoading || uploading}
              className={cn(
                'w-full min-h-11 py-12 rounded-xl border-2 border-dashed border-primary-200 hover:border-primary-400',
                'cursor-pointer select-none',
                'active:scale-[0.97] transition-all duration-150',
                'flex flex-col items-center justify-center',
                'text-primary-400 hover:text-primary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              aria-label="Upload cover image"
            >
              <Image size={32} />
              <p className="text-sm font-medium mt-2">Tap to upload a cover photo</p>
            </button>
          )}
          <UploadProgress
            progress={progress}
            uploading={uploading}
            error={uploadError}
            variant="bar"
          />
          {!coverImageUrl && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Camera size={14} />}
              onClick={handleUpload}
              disabled={cameraLoading || uploading}
            >
              Choose Photo
            </Button>
          )}
        </motion.div>
      </motion.div>
    </Page>
  )
}
