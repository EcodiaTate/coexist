import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

type ChatMessage = Tables<'chat_messages'>
type Profile = Tables<'profiles'>

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChatSearchResult extends ChatMessage {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useChatSearch(collectiveId: string | undefined) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['chat-search', collectiveId, searchQuery],
    queryFn: async () => {
      if (!collectiveId || !searchQuery.trim()) return []

      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_user_id_fkey(id, display_name, avatar_url)
        `)
        .eq('collective_id', collectiveId)
        .eq('is_deleted', false)
        .ilike('content', `%${searchQuery.trim().replace(/[%_\\]/g, '\\$&')}%`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as ChatSearchResult[]
    },
    enabled: !!collectiveId && !!searchQuery.trim() && isSearching,
    staleTime: 30 * 1000,
  })

  const search = useCallback((query: string) => {
    setSearchQuery(query)
    setIsSearching(true)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setIsSearching(false)
  }, [])

  return {
    searchQuery,
    results,
    isLoading: isLoading && isSearching,
    isSearching,
    search,
    clearSearch,
  }
}
