import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Date quick-pick presets                                             */
/* ------------------------------------------------------------------ */

function getDatePresets() {
  const today = new Date()
  const yyyy = (d: Date) => d.toISOString().slice(0, 10)

  // This weekend (Sat-Sun)
  const dayOfWeek = today.getDay()
  const satOffset = dayOfWeek === 0 ? 6 : 6 - dayOfWeek
  const sat = new Date(today)
  sat.setDate(today.getDate() + satOffset)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)

  // Next 7 days
  const week = new Date(today)
  week.setDate(today.getDate() + 7)

  // Next 30 days
  const month = new Date(today)
  month.setDate(today.getDate() + 30)

  // Next 3 months
  const quarter = new Date(today)
  quarter.setMonth(today.getMonth() + 3)

  return [
    { label: 'This weekend', from: yyyy(sat), to: yyyy(sun) },
    { label: 'Next 7 days', from: yyyy(today), to: yyyy(week) },
    { label: 'Next 30 days', from: yyyy(today), to: yyyy(month) },
    { label: 'Next 3 months', from: yyyy(today), to: yyyy(quarter) },
  ]
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface DateRangeSelectorProps {
  dateFrom: string | null
  dateTo: string | null
  onChange: (from: string | null, to: string | null) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function DateRangeSelector({
  dateFrom,
  dateTo,
  onChange,
}: DateRangeSelectorProps) {
  const presets = useMemo(() => getDatePresets(), [])
  const activePreset = presets.find(
    (p) => p.from === dateFrom && p.to === dateTo,
  )

  return (
    <div className="space-y-4">
      {/* Quick presets */}
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const isActive = activePreset === preset
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                if (isActive) {
                  onChange(null, null)
                } else {
                  onChange(preset.from, preset.to)
                }
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 min-h-11 rounded-xl',
                'text-sm font-medium text-left active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-primary-600 ring-1 ring-primary-100 hover:ring-primary-200 hover:bg-primary-50/50',
              )}
              aria-pressed={isActive}
            >
              <Calendar size={14} className={isActive ? 'text-white/70' : 'text-primary-300'} />
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Custom date inputs - collapsible */}
      <div>
        <p className="text-xs font-medium text-primary-400 mb-2">
          Or pick exact dates
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-primary-400 uppercase tracking-wider block mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom ?? ''}
              onChange={(e) =>
                onChange(e.target.value || null, dateTo)
              }
              className={cn(
                'w-full h-11 px-3 rounded-xl',
                'text-sm bg-surface-3',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                'transition-colors duration-150',
                dateFrom
                  ? 'text-primary-800'
                  : 'text-primary-400',
              )}
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-primary-400 uppercase tracking-wider block mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo ?? ''}
              onChange={(e) =>
                onChange(dateFrom, e.target.value || null)
              }
              className={cn(
                'w-full h-11 px-3 rounded-xl',
                'text-sm bg-surface-3',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                'transition-colors duration-150',
                dateTo
                  ? 'text-primary-800'
                  : 'text-primary-400',
              )}
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
