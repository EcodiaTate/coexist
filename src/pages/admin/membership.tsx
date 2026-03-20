import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Plus,
  Gift,
  Tag,
  ShoppingBag,
  Ticket,
  Star,
  Crown,
  Edit3,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { Badge } from '@/components/badge'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import {
  useAdminMembershipRewards,
  useAdminMembershipPlans,
  useUpsertReward,
  useUpsertPlan,
} from '@/hooks/use-membership'
import type { MembershipReward, MembershipPlan, RewardCategory } from '@/types/membership'
import { REWARD_CATEGORIES } from '@/types/membership'

/* ------------------------------------------------------------------ */
/*  Reward category icons                                              */
/* ------------------------------------------------------------------ */

const categoryIcons: Record<RewardCategory, React.ReactNode> = {
  merch: <ShoppingBag size={16} />,
  partner_store: <Tag size={16} />,
  experience: <Star size={16} />,
  event: <Ticket size={16} />,
  other: <Gift size={16} />,
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

type Tab = 'rewards' | 'plans'

/* ------------------------------------------------------------------ */
/*  Reward form bottom sheet                                           */
/* ------------------------------------------------------------------ */

const emptyReward: Partial<MembershipReward> = {
  title: '',
  description: '',
  partner_name: '',
  partner_logo_url: '',
  discount_code: '',
  discount_percent: null,
  category: 'merch',
  is_active: true,
  plans: [],
}

function RewardForm({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: Partial<MembershipReward>
  onSave: (data: Partial<MembershipReward>) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(initial)

  const set = useCallback(
    <K extends keyof MembershipReward>(key: K, value: MembershipReward[K]) =>
      setForm((p) => ({ ...p, [key]: value })),
    [],
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-primary-800 text-lg">
          {initial.id ? 'Edit Reward' : 'New Reward'}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <Input
        label="Title"
        value={form.title ?? ''}
        onChange={(e) => set('title', e.target.value)}
        placeholder="e.g. 20% off Co-Exist tees"
      />
      <Input
        type="textarea"
        label="Description"
        value={form.description ?? ''}
        onChange={(e) => set('description', e.target.value)}
        rows={2}
        placeholder="What the member gets"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Partner name"
          value={form.partner_name ?? ''}
          onChange={(e) => set('partner_name', e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="Partner logo URL"
          value={form.partner_logo_url ?? ''}
          onChange={(e) => set('partner_logo_url', e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Discount code"
          value={form.discount_code ?? ''}
          onChange={(e) => set('discount_code', e.target.value)}
          placeholder="COEXIST20"
        />
        <Input
          label="Discount %"
          type="text"
          value={form.discount_percent?.toString() ?? ''}
          onChange={(e) =>
            set('discount_percent', e.target.value ? Number(e.target.value) : null)
          }
          placeholder="20"
        />
      </div>

      {/* Category selector */}
      <div>
        <p className="text-sm font-medium text-primary-800 mb-2">Category</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(REWARD_CATEGORIES) as RewardCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => set('category', cat)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border cursor-pointer',
                form.category === cat
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-primary-100 bg-white text-primary-400 hover:border-primary-300',
              )}
            >
              {categoryIcons[cat]}
              {REWARD_CATEGORIES[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-primary-100">
        <Toggle
          label="Active"
          description="Visible to members"
          checked={form.is_active ?? true}
          onChange={(v) => set('is_active', v)}
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        loading={saving}
        disabled={!form.title?.trim()}
        onClick={() => onSave(form)}
      >
        {initial.id ? 'Save Changes' : 'Create Reward'}
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main admin membership page                                         */
/* ------------------------------------------------------------------ */

export default function AdminMembershipPage() {
  const shouldReduceMotion = useReducedMotion()
  const { toast } = useToast()

  const { data: rewards, isLoading: rewardsLoading } = useAdminMembershipRewards()
  const { data: plans, isLoading: plansLoading } = useAdminMembershipPlans()
  const upsertReward = useUpsertReward()
  const upsertPlan = useUpsertPlan()

  const [tab, setTab] = useState<Tab>('rewards')
  const [editingReward, setEditingReward] = useState<Partial<MembershipReward> | null>(null)

  const headerActions = useMemo(
    () =>
      tab === 'rewards' ? (
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => setEditingReward(emptyReward)}
        >
          Add Reward
        </Button>
      ) : undefined,
    [tab],
  )

  useAdminHeader('Membership', headerActions)

  const handleSaveReward = useCallback(
    async (data: Partial<MembershipReward>) => {
      try {
        await upsertReward.mutateAsync(data)
        toast.success(data.id ? 'Reward updated' : 'Reward created')
        setEditingReward(null)
      } catch {
        toast.error('Failed to save reward')
      }
    },
    [upsertReward, toast],
  )

  const handleToggleRewardActive = useCallback(
    async (reward: MembershipReward) => {
      try {
        await upsertReward.mutateAsync({ id: reward.id, is_active: !reward.is_active })
        toast.success(reward.is_active ? 'Reward deactivated' : 'Reward activated')
      } catch {
        toast.error('Failed to update reward')
      }
    },
    [upsertReward, toast],
  )

  return (
    <>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-primary-100">
        {(['rewards', 'plans'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer',
              tab === t ? 'text-primary-800' : 'text-primary-400 hover:text-primary-600',
            )}
          >
            {t === 'rewards' ? 'Rewards & Perks' : 'Plans'}
            {tab === t && (
              <motion.span
                layoutId={shouldReduceMotion ? undefined : 'admin-membership-tab'}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-800 rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* ---- Rewards tab ---- */}
      {tab === 'rewards' && (
        <>
          {/* Editing form */}
          <AnimatePresence>
            {editingReward && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-5">
                  <RewardForm
                    initial={editingReward}
                    onSave={handleSaveReward}
                    onClose={() => setEditingReward(null)}
                    saving={upsertReward.isPending}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {rewardsLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : rewards && rewards.length > 0 ? (
            <div className="space-y-2">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border border-primary-100 bg-white px-4 py-3 transition-opacity',
                    !reward.is_active && 'opacity-50',
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-400 shrink-0">
                    {categoryIcons[reward.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-sm text-primary-800 truncate">
                      {reward.title}
                    </p>
                    <p className="text-xs text-primary-400 truncate">
                      {reward.partner_name ? `${reward.partner_name} · ` : ''}
                      {REWARD_CATEGORIES[reward.category]}
                      {reward.discount_code ? ` · ${reward.discount_code}` : ''}
                    </p>
                  </div>
                  <Badge variant={reward.is_active ? 'success' : 'default'} size="sm">
                    {reward.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleRewardActive(reward)}
                      className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 cursor-pointer"
                      aria-label={reward.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {reward.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => setEditingReward(reward)}
                      className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 cursor-pointer"
                      aria-label="Edit reward"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="empty"
              title="No rewards yet"
              description="Add partner discount codes, merch deals, and member perks"
              action={{
                label: 'Add First Reward',
                onClick: () => setEditingReward(emptyReward),
              }}
              className="min-h-[240px]"
            />
          )}
        </>
      )}

      {/* ---- Plans tab ---- */}
      {tab === 'plans' && (
        <>
          {plansLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    'rounded-xl border border-primary-100 bg-white p-5 transition-opacity',
                    !plan.is_active && 'opacity-50',
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown size={18} className="text-primary-500" />
                      <h4 className="font-heading font-bold text-primary-800">{plan.name}</h4>
                      <Badge variant={plan.is_active ? 'success' : 'default'} size="sm">
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-primary-400 mb-3">{plan.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold text-primary-700">
                      ${plan.price_monthly}/mo
                    </span>
                    <span className="text-primary-300">|</span>
                    <span className="font-semibold text-primary-700">
                      ${plan.price_yearly}/yr
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="empty"
              title="No plans configured"
              description="Membership plans will be configured via the Stripe dashboard and synced here."
              className="min-h-[240px]"
            />
          )}

          <div className="mt-6 rounded-xl bg-primary-50 border border-primary-100 p-4">
            <p className="text-sm text-primary-500">
              Plans are managed via Stripe Products. Create or modify plans in your Stripe
              dashboard and they'll sync here automatically.
            </p>
          </div>
        </>
      )}
    </>
  )
}
