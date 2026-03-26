import { useEffect, useCallback, startTransition } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Save,
    Lock,
    Pencil,
} from 'lucide-react'
import {
    useEventDetail,
    useUpdateEvent,
} from '@/hooks/use-events'
import { useEventForm } from '@/hooks/use-event-form'
import {
    BasicsFields,
    DateTimeFields,
    LocationFields,
    DetailsFields,
    CoverImageFields,
} from './components/event-form-fields'
import {
    Page,
    Header,
    Button,
    Skeleton,
    EmptyState,
} from '@/components'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function EditEventPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDayOfMode = searchParams.get('mode') === 'day-of'
  const shouldReduceMotion = useReducedMotion()

  const { data: event, isLoading } = useEventDetail(eventId)
  const showLoading = useDelayedLoading(isLoading)
  const updateEvent = useUpdateEvent()

  const form = useEventForm({ mode: 'edit' })

  // Pre-populate from event data
  useEffect(() => {
    if (!event) return
    const pos = parseLocationPoint(event.location_point)
    startTransition(() => {
      form.resetFields({
        title: event.title,
        activity_type: event.activity_type,
        description: event.description ?? '',
        date_start: new Date(event.date_start),
        date_end: event.date_end ? new Date(event.date_end) : null,
        address: event.address ?? '',
        location_lat: pos?.lat ?? null,
        location_lng: pos?.lng ?? null,
        capacity: event.capacity ? String(event.capacity) : '',
        cover_image_url: event.cover_image_url ?? '',
        is_public: event.is_public ?? true,
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  const handleSave = useCallback(async () => {
    if (!eventId) return

    const locationPoint = form.buildLocationPoint()

    if (isDayOfMode) {
      // Day-of mode: only update time and address
      if (!form.fields.date_start) return
      await updateEvent.mutateAsync({
        eventId,
        date_start: form.fields.date_start.toISOString(),
        date_end: form.fields.date_end?.toISOString() ?? null,
        address: form.fields.address || null,
        location_point: locationPoint,
      })
    } else {
      if (!form.isBasicsValid || !form.isDateValid) return
      await updateEvent.mutateAsync({
        eventId,
        title: form.fields.title,
        description: form.fields.description || null,
        activity_type: form.fields.activity_type as Exclude<typeof form.fields.activity_type, ''>,
        date_start: form.fields.date_start!.toISOString(),
        date_end: form.fields.date_end?.toISOString() ?? null,
        address: form.fields.address || null,
        location_point: locationPoint,
        capacity: form.parsedCapacity(),
        cover_image_url: form.fields.cover_image_url || null,
        is_public: form.fields.is_public,
      })
    }

    navigate(`/events/${eventId}`, { replace: true })
  }, [eventId, isDayOfMode, form, updateEvent, navigate])

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  const pageTitle = isDayOfMode ? 'Edit Time & Location' : 'Edit Event'

  if (showLoading) {
    return (
      <Page swipeBack header={<Header title={pageTitle} back />}>
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
      <Page swipeBack header={<Header title={pageTitle} back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="This event may have been removed."
          action={{ label: 'Go Back', onClick: () => navigate(-1) }}
        />
      </Page>
    )
  }

  const canSave = isDayOfMode
    ? form.fields.date_start !== null
    : form.isBasicsValid && form.isDateValid

  return (
    <Page
      swipeBack
      header={<Header title={pageTitle} back />}
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
        <motion.div variants={fadeUp} className={cn(
          'space-y-4 rounded-2xl p-4 border',
          isDayOfMode
            ? 'bg-primary-50/30 border-primary-100/40 opacity-60 pointer-events-none'
            : 'bg-white border-primary-100/40',
        )}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {isDayOfMode ? (
              <>
                <Lock size={13} className="text-primary-300" />
                <span className="text-primary-400">Basics</span>
              </>
            ) : (
              <span className="text-primary-800">Basics</span>
            )}
          </h3>
          <BasicsFields
            fields={form.fields}
            onChange={form.updateFields}
            disabled={isDayOfMode}
          />
        </motion.div>

        {/* Date & Time  editable in day-of mode */}
        <motion.div variants={fadeUp} className={cn(
          'space-y-4 rounded-2xl p-4 border',
          isDayOfMode
            ? 'bg-moss-50/60 border-moss-300 ring-2 ring-moss-200'
            : 'bg-white border-primary-100/40',
        )}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {isDayOfMode ? (
              <>
                <Pencil size={13} className="text-moss-600" />
                <span className="text-moss-700">Date & Time</span>
              </>
            ) : (
              <span className="text-primary-800">Date & Time</span>
            )}
          </h3>
          <DateTimeFields
            fields={form.fields}
            onChange={form.updateFields}
          />
        </motion.div>

        {/* Location  editable in day-of mode */}
        <motion.div variants={fadeUp} className={cn(
          'space-y-4 rounded-2xl p-4 border',
          isDayOfMode
            ? 'bg-moss-50/60 border-moss-300 ring-2 ring-moss-200'
            : 'bg-white border-primary-100/40',
        )}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {isDayOfMode ? (
              <>
                <Pencil size={13} className="text-moss-600" />
                <span className="text-moss-700">Location</span>
              </>
            ) : (
              <span className="text-primary-800">Location</span>
            )}
          </h3>
          <LocationFields
            fields={form.fields}
            onChange={form.updateFields}
          />
        </motion.div>

        {/* Details */}
        <motion.div variants={fadeUp} className={cn(
          'space-y-4 rounded-2xl p-4 border',
          isDayOfMode
            ? 'bg-primary-50/30 border-primary-100/40 opacity-60 pointer-events-none'
            : 'bg-white border-primary-100/40',
        )}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {isDayOfMode ? (
              <>
                <Lock size={13} className="text-primary-300" />
                <span className="text-primary-400">Details</span>
              </>
            ) : (
              <span className="text-primary-800">Details</span>
            )}
          </h3>
          <DetailsFields
            fields={form.fields}
            onChange={form.updateFields}
            disabled={isDayOfMode}
          />
        </motion.div>

        {/* Cover Image */}
        <motion.div variants={fadeUp} className={cn(
          'space-y-3 rounded-2xl p-4 border',
          isDayOfMode
            ? 'bg-primary-50/30 border-primary-100/40 opacity-60 pointer-events-none'
            : 'bg-white border-primary-100/40',
        )}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            {isDayOfMode ? (
              <>
                <Lock size={13} className="text-primary-300" />
                <span className="text-primary-400">Cover Image</span>
              </>
            ) : (
              <span className="text-primary-800">Cover Image</span>
            )}
          </h3>
          <CoverImageFields
            coverImageUrl={form.fields.cover_image_url}
            onUpload={form.handleUploadFromGallery}
            onRemove={form.removeCoverImage}
            uploading={form.uploading}
            cameraLoading={form.cameraLoading}
            uploadProgress={form.uploadProgress}
            uploadError={form.uploadError}
            disabled={isDayOfMode}
          />
        </motion.div>
      </motion.div>
    </Page>
  )
}
