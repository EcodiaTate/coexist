import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Eye,
  Users,
  ArrowRight,
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SuperAdminPage() {
  const [impersonateEmail, setImpersonateEmail] = useState('')

  useAdminHeader('Super Admin')

  const impersonateMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: user } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('email', email)
        .single()
      if (!user) throw new Error('User not found')

      await supabase.from('audit_log' as any).insert({
        action: 'impersonation_started',
        target_type: 'user',
        target_id: user.id,
        details: { message: `Viewing as ${user.display_name} (${email}) - read-only mode` },
      } as any)

      return user
    },
  })

  const shouldReduceMotion = useReducedMotion()

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Staff management redirect */}
      <motion.div variants={fadeUp}>
        <Link
          to="/admin/users"
          className={cn(
            'flex items-center justify-between p-4 rounded-xl',
            'bg-primary-50/50 shadow-sm',
            'hover:bg-primary-50 transition-colors duration-150',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
              <Users size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-800">Staff & Permissions</p>
              <p className="text-xs text-primary-400">
                Manage staff roles, collective assignments, and granular capabilities from the Users page
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-primary-400 shrink-0" />
        </Link>
      </motion.div>

      {/* View as User (Impersonation) */}
      <motion.div variants={fadeUp} className="max-w-md space-y-4">
        <div className="p-4 rounded-xl bg-warning-50 shadow-sm">
          <div className="flex items-start gap-3">
            <Eye size={18} className="text-warning-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-warning-900">
                View as User - Read Only
              </h3>
              <p className="text-xs text-warning-700 mt-1">
                This feature allows you to see the app as a specific user would see it.
                All actions are read-only and the impersonation is logged in the audit trail.
              </p>
            </div>
          </div>
        </div>

        <Input
          label="User Email"
          type="email"
          value={impersonateEmail}
          onChange={(e) => setImpersonateEmail(e.target.value)}
          placeholder="user@example.com"
        />

        <Button
          variant="secondary"
          icon={<Eye size={16} />}
          onClick={() => impersonateMutation.mutate(impersonateEmail)}
          loading={impersonateMutation.isPending}
          disabled={!impersonateEmail.trim()}
        >
          View as User
        </Button>

        {impersonateMutation.isSuccess && (
          <div className="p-3 rounded-lg bg-success-50 shadow-sm">
            <p className="text-sm text-success-700">
              Impersonation logged. In production, this would switch the view to show
              the app from the perspective of{' '}
              <strong>{(impersonateMutation.data as any)?.display_name}</strong>.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
