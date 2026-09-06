import { Sparkles, Check, Eye, EyeOff } from 'lucide-react'
import { Dropdown } from '@/components'
import { cn } from '@/lib/cn'
import type { CoverImageSuggestion } from '@/hooks/use-cover-image-suggestions'
import type { EventFormFields } from '@/hooks/use-event-form'
import { CHECKIN_WINDOW_OPTIONS } from './checkin-window-options'

/* ------------------------------------------------------------------ */
/*  Fields both event forms need, extracted from create-event          */
/*                                                                     */
/*  Cover-image suggestions existed only at creation time (2.F7), so a  */
/*  leader replacing the cover on a published event had to leave the    */
/*  app and hunt for a photo the create wizard would have offered them  */
/*  in a row. The check-in-window dropdown was hand-duplicated verbatim  */
/*  in both pages (2.F10), options and helper copy included, so adding   */
/*  a "60 minutes before" tier meant editing two files and noticing the  */
/*  second one.                                                         */
/* ------------------------------------------------------------------ */

export function CoverImageSuggestions({
  suggestions,
  loading,
  selectedUrl,
  onSelect,
}: {
  suggestions: CoverImageSuggestion[]
  loading: boolean
  selectedUrl: string
  onSelect: (s: CoverImageSuggestion) => void
}) {
  if (!loading && suggestions.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-primary-500" />
        <p className="text-sm font-semibold text-primary-700">
          Suggested from past events
        </p>
      </div>
      <p className="text-caption text-neutral-500">
        Photos from this collective and activity type. Tap one to use it.
      </p>

      {loading && suggestions.length === 0 ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 w-28 shrink-0 rounded-sm bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x">
          {suggestions.map((s) => {
            const active = s.url === selectedUrl
            return (
              <button
                key={s.storagePath}
                type="button"
                onClick={() => onSelect(s)}
                aria-label={`Use photo from ${s.eventTitle ?? 'a past event'}`}
                aria-pressed={active}
                className={cn(
                  'relative h-20 w-28 shrink-0 snap-start overflow-hidden rounded-sm',
                  'cursor-pointer select-none active:scale-[0.98] transition-transform duration-150',
                  active
                    ? 'ring-2 ring-primary-500 ring-offset-1'
                    : 'ring-1 ring-neutral-200 hover:ring-neutral-300',
                )}
              >
                <img
                  src={s.thumbnailUrl}
                  alt={s.eventTitle ?? 'Past event photo'}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary-900/30">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
                      <Check size={15} className="text-primary-600" />
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Check-in window                                                    */
/* ------------------------------------------------------------------ */

/**
 * Both pages already used the same label and the same two options; only the
 * explanatory line differed, in that create had one and edit did not. Edit
 * gains it here, which is the point: the sentence answers "can I open check-in
 * early?" and a leader editing an event is at least as likely to be asking.
 */
export function CheckinWindowField({
  minutes,
  onChange,
}: {
  minutes: number
  onChange: (minutes: number) => void
}) {
  return (
    <>
      <Dropdown
        label="When should check-in open?"
        value={String(minutes)}
        onChange={(v) => onChange(parseInt(v, 10))}
        options={CHECKIN_WINDOW_OPTIONS}
      />
      <p className="text-caption text-neutral-500 mt-2">
        Check-in can open up to 30 minutes before the event starts. Leaders can always override this and open check-in early from the event page.
      </p>
    </>
  )
}

/**
 * Visibility, as one control both forms use (finding 2.F8).
 *
 * The same boolean had two unrelated UIs: create showed two selectable cards
 * naming what each choice means, edit showed a bare "Public Event" toggle
 * bundled next to Capacity. The cards win because they say what the OTHER
 * option does, which a toggle cannot; a leader making an event
 * collective-only should not have to infer it from an unchecked box.
 */
export function VisibilityField({
  fields,
  onChange,
  disabled,
}: {
  fields: Pick<EventFormFields, 'is_public'>
  onChange: (updates: { is_public: boolean }) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500 mb-1">
        Choose who can discover and register for this event.
      </p>

      {/* Public option */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ is_public: true })}
        className={cn(
          'w-full min-h-11 flex items-center gap-4 p-4 rounded-md cursor-pointer select-none text-left',
          'active:scale-[0.97] transition-transform duration-200',
          'border',
          fields.is_public
            ? 'border-primary-400 shadow-sm bg-sprout-50 ring-1 ring-primary-300/50'
            : 'border-neutral-100 bg-surface-0 hover:bg-surface-1',
        )}
      >
        <div
          className={cn(
            'w-11 h-11 rounded-sm flex items-center justify-center shrink-0 transition-colors',
            fields.is_public
              ? 'bg-primary-500 text-white'
              : 'bg-surface-2 text-neutral-400',
          )}
        >
          <Eye size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900">Public</p>
          <p className="text-caption text-neutral-500 mt-0.5">
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
        disabled={disabled}
        onClick={() => onChange({ is_public: false })}
        className={cn(
          'w-full min-h-11 flex items-center gap-4 p-4 rounded-md cursor-pointer select-none text-left',
          'active:scale-[0.97] transition-transform duration-200',
          'border',
          !fields.is_public
            ? 'border-plum-400 shadow-sm bg-primary-50 ring-1 ring-plum-300/50'
            : 'border-neutral-100 bg-surface-0 hover:bg-surface-1',
        )}
      >
        <div
          className={cn(
            'w-11 h-11 rounded-sm flex items-center justify-center shrink-0 transition-colors',
            !fields.is_public
              ? 'bg-plum-500 text-white'
              : 'bg-surface-2 text-neutral-400',
          )}
        >
          <EyeOff size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900">
            Collective Only
          </p>
          <p className="text-caption text-neutral-500 mt-0.5">
            Only members of the selected collectives can see and register
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
