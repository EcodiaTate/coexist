import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Access a Supabase table that isn't in the generated Database types yet.
 * Centralises the single `as any` cast so hook files stay clean.
 * Remove once `supabase gen types` is re-run.
 */
type UntypedTable = 'leader_todos' | 'impact_metric_defs' | 'app_settings'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const untypedFrom = (table: UntypedTable) => (supabase as any).from(table) as any

/** Escape special PostgREST LIKE/ILIKE characters in user-supplied search input */
export function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`)
}
