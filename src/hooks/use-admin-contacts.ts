import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, escapeIlike } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import type { EmergencyContact, TablesInsert, TablesUpdate } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ContactCategory = 'emergency' | 'wildlife' | 'marine' | 'poison' | 'ses' | 'internal'

export interface ContactCategoryMeta {
  id: ContactCategory
  label: string
  color: string
  iconBg: string
}

export const CONTACT_CATEGORIES: ContactCategoryMeta[] = [
  { id: 'emergency', label: 'Emergency Services', color: 'text-red-600', iconBg: 'bg-red-100' },
  { id: 'wildlife', label: 'Wildlife Rescue', color: 'text-moss-600', iconBg: 'bg-moss-100' },
  { id: 'marine', label: 'Marine Wildlife', color: 'text-sky-600', iconBg: 'bg-sky-100' },
  { id: 'poison', label: 'Poisoning & Snakebite', color: 'text-amber-600', iconBg: 'bg-amber-100' },
  { id: 'ses', label: 'SES & National Parks', color: 'text-primary-600', iconBg: 'bg-primary-100' },
  { id: 'internal', label: 'Co-Exist Internal', color: 'text-plum-600', iconBg: 'bg-plum-100' },
]

export const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const
export type AustralianState = (typeof AUSTRALIAN_STATES)[number]

/* ------------------------------------------------------------------ */
/*  Admin: full list (includes inactive)                               */
/* ------------------------------------------------------------------ */

export function useAdminContacts(filters: {
  search: string
  category: string
}) {
  return useQuery({
    queryKey: ['admin-contacts', filters],
    queryFn: async () => {
      let query = supabase
        .from('emergency_contacts')
        .select('*')
        .order('category')
        .order('sort_order')

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.search) {
        const s = escapeIlike(filters.search)
        query = query.or(`name.ilike.%${s}%,note.ilike.%${s}%,phone.ilike.%${s}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as EmergencyContact[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: create                                                      */
/* ------------------------------------------------------------------ */

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TablesInsert<'emergency_contacts'>) => {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      await logAudit({ action: 'emergency_contact_created', target_id: data.id, details: { name: input.name } })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-contacts'] })
      qc.invalidateQueries({ queryKey: ['emergency-contacts'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: update                                                      */
/* ------------------------------------------------------------------ */

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'emergency_contacts'> & { id: string }) => {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await logAudit({ action: 'emergency_contact_updated', target_id: id, details: { name: updates.name } })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-contacts'] })
      qc.invalidateQueries({ queryKey: ['emergency-contacts'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: delete                                                      */
/* ------------------------------------------------------------------ */

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id)
      if (error) throw error
      await logAudit({ action: 'emergency_contact_deleted', target_id: id })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-contacts'] })
      qc.invalidateQueries({ queryKey: ['emergency-contacts'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Public: active contacts, optionally filtered by state              */
/* ------------------------------------------------------------------ */

export function useEmergencyContacts(eventState?: string | null) {
  return useQuery({
    queryKey: ['emergency-contacts', eventState ?? 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('sort_order')
      if (error) throw error

      // Client-side state filter: include contacts where states is empty (all-states)
      // or where the event state is in the contact's states array
      if (eventState) {
        return (data as EmergencyContact[]).filter(
          (c) => c.states.length === 0 || c.states.includes(eventState),
        )
      }
      return data as EmergencyContact[]
    },
    staleTime: 5 * 60 * 1000,
  })
}
