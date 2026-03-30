import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

/* ------------------------------------------------------------------ */
/*  Capability definitions                                             */
/* ------------------------------------------------------------------ */

export interface CapabilityDef {
  key: string
  label: string
  description: string
  category: 'users' | 'content' | 'operations' | 'finance' | 'system'
}

export const CAPABILITIES: CapabilityDef[] = [
  // Users & Collectives
  { key: 'manage_users', label: 'Manage Users', description: 'View/edit/deactivate user profiles and roles', category: 'users' },
  { key: 'manage_collectives', label: 'Manage Collectives', description: 'Create/archive/reassign collectives', category: 'users' },

  // Content & Moderation
  { key: 'manage_content', label: 'Manage Content', description: 'Moderate photos, chat messages', category: 'content' },
  { key: 'send_announcements', label: 'Send Updates', description: 'Create/publish global updates', category: 'content' },
  { key: 'manage_email', label: 'Manage Email', description: 'Create and send email campaigns', category: 'content' },

  // Operations
  { key: 'manage_events', label: 'Manage Events', description: 'Create/edit/cancel events across collectives', category: 'operations' },
  { key: 'manage_workflows', label: 'Manage Workflows', description: 'Create/edit task templates and view KPI dashboard', category: 'operations' },
  { key: 'manage_partners', label: 'Manage Partners', description: 'Partner CRUD and sponsorship management', category: 'operations' },
  { key: 'manage_challenges', label: 'Manage Challenges', description: 'Create/edit/manage challenges', category: 'operations' },
  { key: 'manage_surveys', label: 'Manage Surveys', description: 'Create/edit surveys and view responses', category: 'operations' },

  // Finance & Merch
  { key: 'manage_merch', label: 'Manage Merch', description: 'Product CRUD, inventory, orders', category: 'finance' },
  { key: 'manage_finances', label: 'Manage Finances', description: 'View donations, refunds, financial reports', category: 'finance' },
  { key: 'manage_charity', label: 'Manage Charity', description: 'Charity settings and donation config', category: 'finance' },

  // System & Reports
  { key: 'view_reports', label: 'View Reports', description: 'Access reports and analytics pages', category: 'system' },
  { key: 'manage_exports', label: 'Manage Exports', description: 'Export data from the platform', category: 'system' },
  { key: 'view_audit_log', label: 'View Audit Log', description: 'Access system audit log', category: 'system' },
  { key: 'manage_system', label: 'Manage System', description: 'System settings and configuration', category: 'system' },
]

export const CAPABILITY_KEYS = CAPABILITIES.map((c) => c.key)
export type CapabilityKey = typeof CAPABILITY_KEYS[number]

/** Category labels for grouping in UI */
export const CATEGORY_LABELS: Record<CapabilityDef['category'], string> = {
  users: 'Users & Collectives',
  content: 'Content & Moderation',
  operations: 'Operations',
  finance: 'Finance & Merch',
  system: 'System & Reports',
}

/* ------------------------------------------------------------------ */
/*  Role → default capabilities mapping                                */
/* ------------------------------------------------------------------ */

/** Which capabilities each global role gets by default */
export const ROLE_DEFAULT_CAPS: Record<UserRole, readonly string[]> = {
  participant: [],
  national_leader: [
    'manage_content',
    'manage_events',
    'view_reports',
  ],
  national_admin: [
    'manage_users',
    'manage_collectives',
    'manage_content',
    'manage_events',
    'manage_workflows',
    'manage_partners',
    'manage_challenges',
    'manage_surveys',
    'manage_merch',
    'send_announcements',
    'manage_email',
    'manage_charity',
    'view_reports',
    'manage_exports',
  ],
  super_admin: CAPABILITY_KEYS,
}

/* ------------------------------------------------------------------ */
/*  Resolver                                                           */
/* ------------------------------------------------------------------ */

/**
 * Resolves the final set of capabilities for a user given their global role
 * and any per-user overrides stored in staff_roles.permissions.
 *
 * Override values:
 *   true  → grant (even if role default doesn't include it)
 *   false → revoke (even if role default includes it)
 *   absent → use role default
 */
export function resolveCapabilities(
  role: UserRole,
  overrides?: Record<string, boolean> | null,
): Set<string> {
  const defaults = new Set(ROLE_DEFAULT_CAPS[role])

  if (!overrides) return defaults

  for (const [key, granted] of Object.entries(overrides)) {
    if (granted) {
      defaults.add(key)
    } else {
      defaults.delete(key)
    }
  }

  return defaults
}

/** Simple check against a resolved capability set */
export function hasCapability(caps: Set<string>, key: string): boolean {
  return caps.has(key)
}
