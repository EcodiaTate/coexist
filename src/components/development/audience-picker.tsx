import {
  Users,
  Check,
  Shield,
  Crown,
  UserPlus,
  Briefcase,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { TARGET_ROLE_OPTIONS } from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  Role icons                                                         */
/* ------------------------------------------------------------------ */

const ROLE_ICONS: Record<string, React.ReactNode> = {
  leader: <Crown size={14} />,
  co_leader: <Shield size={14} />,
  assist_leader: <UserPlus size={14} />,
  national_staff: <Briefcase size={14} />,
}

const ROLE_COLORS: Record<string, string> = {
  leader: 'bg-amber-100 text-amber-700 border-amber-200',
  co_leader: 'bg-sky-100 text-sky-700 border-sky-200',
  assist_leader: 'bg-secondary-100 text-secondary-700 border-secondary-200',
  national_staff: 'bg-bark-100 text-bark-700 border-bark-200',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AudiencePickerProps {
  selectedRoles: string[]
  onRolesChange: (roles: string[]) => void
  className?: string
}

export function AudiencePicker({
  selectedRoles,
  onRolesChange,
  className,
}: AudiencePickerProps) {
  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      onRolesChange(selectedRoles.filter((r) => r !== role))
    } else {
      onRolesChange([...selectedRoles, role])
    }
  }

  const selectAll = () => {
    onRolesChange(TARGET_ROLE_OPTIONS.map((r) => r.value))
  }

  const clearAll = () => {
    onRolesChange([])
  }

  const allSelected = selectedRoles.length === TARGET_ROLE_OPTIONS.length

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-primary-700">
          Target Audience
        </label>
        <button
          type="button"
          onClick={allSelected ? clearAll : selectAll}
          className="text-xs font-semibold text-primary-500 hover:text-primary-700 transition-colors"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <p className="text-xs text-primary-400">
        Who should see this content? Leave empty for all authenticated users.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {TARGET_ROLE_OPTIONS.map((role) => {
          const isSelected = selectedRoles.includes(role.value)
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => toggleRole(role.value)}
              className={cn(
                'flex items-center gap-2.5 px-3.5 min-h-[48px] rounded-xl border-2 text-left transition-transform active:scale-[0.97]',
                isSelected
                  ? ROLE_COLORS[role.value]
                  : 'border-primary-200 bg-white text-primary-500 hover:border-primary-300',
              )}
            >
              <span className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg shrink-0',
                isSelected ? 'bg-white/60' : 'bg-primary-50',
              )}>
                {ROLE_ICONS[role.value]}
              </span>
              <span className="flex-1 text-sm font-semibold">{role.label}</span>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-white/80 shrink-0"
                >
                  <Check size={10} />
                </motion.span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected summary */}
      {selectedRoles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 border border-primary-100"
        >
          <Users size={12} className="text-primary-500 shrink-0" />
          <p className="text-xs text-primary-600 flex-1">
            Visible to: {selectedRoles.map((r) => TARGET_ROLE_OPTIONS.find((o) => o.value === r)?.label).filter(Boolean).join(', ')}
          </p>
        </motion.div>
      )}
    </div>
  )
}

export default AudiencePicker
