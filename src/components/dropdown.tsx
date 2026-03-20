import {
  type ReactNode,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { BottomSheet } from './bottom-sheet'

interface DropdownOption {
  value: string
  label: string
  icon?: ReactNode
}

interface DropdownProps {
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  disabled = false,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const id = useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const listboxId = `${id}-listbox`

  const selectedOption = options.find((o) => o.value === value)

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue)
      setOpen(false)
      requestAnimationFrame(() => triggerRef.current?.focus())
    },
    [onChange],
  )

  // Close popover on outside click (desktop)
  useEffect(() => {
    if (!open || isMobile) return

    const handleClick = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, isMobile])

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      id={id}
      disabled={disabled}
      onClick={() => setOpen((prev) => !prev)}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={error ? errorId : undefined}
      aria-label={!label ? placeholder : undefined}
      className={cn(
        'flex items-center justify-between w-full rounded-lg border bg-white px-4 py-3',
        'text-[16px] leading-normal text-left',
        'cursor-pointer select-none',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error
          ? 'border-error'
          : open
            ? 'border-primary-500 ring-1 ring-primary-500'
            : 'border-primary-200',
      )}
    >
      <span
        className={cn(
          'truncate',
          selectedOption ? 'text-primary-800' : 'text-primary-400',
        )}
      >
        {selectedOption ? (
          <span className="flex items-center gap-2">
            {selectedOption.icon && (
              <span className="shrink-0" aria-hidden="true">
                {selectedOption.icon}
              </span>
            )}
            {selectedOption.label}
          </span>
        ) : (
          placeholder
        )}
      </span>
      <ChevronDown
        size={18}
        className={cn(
          'shrink-0 ml-2 text-primary-400 transition-transform duration-150',
          open && 'rotate-180',
        )}
        aria-hidden="true"
      />
    </button>
  )

  const optionsList = (
    <ul
      id={listboxId}
      role="listbox"
      aria-labelledby={label ? labelId : undefined}
      className={cn(isMobile ? 'px-2 pb-2' : '')}
    >
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <li
            key={option.value}
            role="option"
            aria-selected={isSelected}
            onClick={() => handleSelect(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelect(option.value)
              }
            }}
            tabIndex={0}
            className={cn(
              'flex items-center justify-between gap-3 px-4 py-3 rounded-lg',
              'cursor-pointer select-none',
              'transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
              isSelected
                ? 'bg-white text-primary-400'
                : 'text-primary-800 hover:bg-primary-50 active:bg-primary-50',
            )}
          >
            <span className="flex items-center gap-3 min-w-0">
              {option.icon && (
                <span className="shrink-0" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span className="truncate">{option.label}</span>
            </span>
            {isSelected && (
              <Check
                size={18}
                className="shrink-0 text-primary-400"
                aria-hidden="true"
              />
            )}
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          id={labelId}
          htmlFor={id}
          className="block mb-1.5 text-sm font-medium text-primary-800"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {trigger}

        {/* Desktop popover */}
        {!isMobile && (
          <AnimatePresence>
            {open && (
              <motion.div
                ref={popoverRef}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'absolute left-0 right-0 top-full mt-1 z-50',
                  'bg-white border border-primary-200 rounded-lg shadow-lg',
                  'max-h-60 overflow-y-auto',
                  'py-1',
                )}
              >
                {optionsList}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && (
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          snapPoints={[0.4]}
        >
          <h3 className="font-heading text-base font-semibold text-primary-800 mb-3">
            {label ?? placeholder}
          </h3>
          {optionsList}
        </BottomSheet>
      )}

      {/* Error text */}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-caption text-error">
          {error}
        </p>
      )}
    </div>
  )
}
