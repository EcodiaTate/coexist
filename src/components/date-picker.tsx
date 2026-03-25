import { useId, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'

type DatePickerMode = 'date' | 'time' | 'datetime'

interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  label?: string
  error?: string
  min?: Date
  max?: Date
  mode?: DatePickerMode
  className?: string
}

function formatDate(date: Date, mode: DatePickerMode): string {
  const options: Intl.DateTimeFormatOptions = {}

  if (mode === 'date' || mode === 'datetime') {
    options.year = 'numeric'
    options.month = 'long'
    options.day = 'numeric'
  }
  if (mode === 'time' || mode === 'datetime') {
    options.hour = 'numeric'
    options.minute = '2-digit'
  }

  return new Intl.DateTimeFormat(undefined, options).format(date)
}

function toInputType(mode: DatePickerMode): string {
  switch (mode) {
    case 'date':
      return 'date'
    case 'time':
      return 'time'
    case 'datetime':
      return 'datetime-local'
  }
}

function dateToInputValue(date: Date, mode: DatePickerMode): string {
  if (mode === 'date') {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (mode === 'time') {
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${h}:${min}`
  }
  // datetime-local
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function inputValueToDate(value: string, mode: DatePickerMode): Date | null {
  if (!value) return null

  if (mode === 'time') {
    const [h, m] = value.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d
  }

  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  label,
  error,
  min,
  max,
  mode = 'date',
  className,
}: DatePickerProps) {
  const id = useId()
  const errorId = `${id}-error`
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const inputType = toInputType(mode)

  const defaultPlaceholder =
    placeholder ??
    (mode === 'date'
      ? 'Select date'
      : mode === 'time'
        ? 'Select time'
        : 'Select date & time')

  const handleTriggerClick = () => {
    inputRef.current?.showPicker?.()
    inputRef.current?.focus()
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = inputValueToDate(e.target.value, mode)
    onChange(date)
  }

  const IconComponent = mode === 'time' ? Clock : Calendar

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={id}
          className="block mb-1.5 text-sm font-medium text-primary-800"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {/* Visible trigger button */}
        <button
          type="button"
          onClick={handleTriggerClick}
          aria-label={label ?? defaultPlaceholder}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'flex items-center w-full rounded-lg bg-surface-3 px-4 py-3 min-h-12',
            'text-[16px] leading-normal text-left',
            'cursor-pointer select-none',
            'transition-transform duration-150 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
            error
              ? 'ring-2 ring-error'
              : 'hover:bg-primary-200/50 hover:shadow-sm',
          )}
        >
          <IconComponent
            size={18}
            className="shrink-0 mr-3 text-primary-400"
            aria-hidden="true"
          />
          <span
            className={cn(
              'flex-1 truncate',
              value ? 'text-primary-800' : 'text-primary-400',
            )}
          >
            {value ? formatDate(value, mode) : defaultPlaceholder}
          </span>
        </button>

        {/* Hidden native input */}
        <input
          ref={inputRef}
          id={id}
          type={inputType}
          value={value ? dateToInputValue(value, mode) : ''}
          onChange={handleChange}
          min={min ? dateToInputValue(min, mode) : undefined}
          max={max ? dateToInputValue(max, mode) : undefined}
          aria-label={label ?? defaultPlaceholder}
          aria-invalid={!!error}
          tabIndex={-1}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        />
      </div>

      {/* Error text */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            id={errorId}
            role="alert"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-1.5 text-caption text-error"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
