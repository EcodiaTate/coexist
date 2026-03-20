import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Post, PostComment, Collective, Event } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PostAuthor {
  id: string
  display_name: string | null
  avatar_url: string | null
  membership_level: string
}

export interface PostWithDetails extends Post {
  author: PostAuthor | null
  collective: Pick<Collective, 'id' | 'name'> | null
  event: Pick<Event, 'id' | 'title' | 'activity_type' | 'cover_image_url'> | null
  like_count: number
  comment_count: number
  is_liked: boolean
}

export interface CommentWithAuthor extends PostComment {
  author: PostAuthor | null
}

const PAGE_SIZE = 15

/* ------------------------------------------------------------------ */
/*  Feed - infinite scroll                                             */
/* ------------------------------------------------------------------ */

export function useFeed(collectiveId?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: ['feed', collectiveId ?? 'all'],
    queryFn: async ({ pageParam = 0 }) => {
      let q = supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(id, display_name, avatar_url, membership_level),
          collective:collectives!posts_collective_id_fkey(id, name),
          event:events!posts_event_id_fkey(id, title, activity_type, cover_image_url)
        `)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      if (collectiveId) {
        q = q.eq('collective_id', collectiveId)
      }

      const { data, error } = await q
      if (error) throw error

      // Fetch likes + comments counts + user like status in parallel
      const postIds = (data ?? []).map((p) => p.id)
      if (postIds.length === 0) return []

      const [likesRes, commentsRes, userLikesRes] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id', { count: 'exact', head: false })
          .in('post_id', postIds),
        supabase
          .from('post_comments')
          .select('post_id', { count: 'exact', head: false })
          .in('post_id', postIds)
          .eq('is_deleted', false),
        user
          ? supabase
              .from('post_likes')
              .select('post_id')
              .in('post_id', postIds)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
      ])

      // Count per post
      const likeCounts: Record<string, number> = {}
      const commentCounts: Record<string, number> = {}
      const userLikedSet = new Set<string>()

      for (const row of likesRes.data ?? []) {
        likeCounts[row.post_id] = (likeCounts[row.post_id] ?? 0) + 1
      }
      for (const row of commentsRes.data ?? []) {
        commentCounts[row.post_id] = (commentCounts[row.post_id] ?? 0) + 1
      }
      const userLikesData = 'data' in userLikesRes ? userLikesRes.data : userLikesRes
      for (const row of userLikesData ?? []) {
        userLikedSet.add(row.post_id)
      }

      return (data ?? []).map((post) => ({
        ...post,
        like_count: likeCounts[post.id] ?? 0,
        comment_count: commentCounts[post.id] ?? 0,
        is_liked: userLikedSet.has(post.id),
      })) as PostWithDetails[]
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.reduce((sum, page) => sum + page.length, 0)
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
  })

  // Realtime subscription for new posts
  useEffect(() => {
    const filter = collectiveId
      ? `collective_id=eq.${collectiveId}`
      : undefined

    const channel = supabase
      .channel(`posts:${collectiveId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          ...(filter ? { filter } : {}),
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['feed', collectiveId ?? 'all'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [collectiveId, queryClient])

  return query
}

/* ------------------------------------------------------------------ */
/*  Create post                                                        */
/* ------------------------------------------------------------------ */

interface CreatePostParams {
  content: string
  images?: string[]
  collectiveId: string
  eventId?: string
  type?: string
}

export function useCreatePost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ content, images, collectiveId, eventId, type }: CreatePostParams) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          images: images ?? [],
          collective_id: collectiveId,
          event_id: eventId ?? null,
          type: type ?? 'photo',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Like / unlike                                                      */
/* ------------------------------------------------------------------ */

export function useToggleLike() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Not authenticated')

      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id })
        if (error) throw error
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['feed'] })

      queryClient.setQueriesData<{ pages: PostWithDetails[][] }>(
        { queryKey: ['feed'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      is_liked: !isLiked,
                      like_count: post.like_count + (isLiked ? -1 : 1),
                    }
                  : post,
              ),
            ),
          }
        },
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Comments                                                           */
/* ------------------------------------------------------------------ */

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          author:profiles!post_comments_user_id_fkey(id, display_name, avatar_url, membership_level)
        `)
        .eq('post_id', postId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as CommentWithAuthor[]
    },
    staleTime: 60 * 1000,
  })
}

export function useAddComment() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: user.id, content })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] })
      // Update comment count in feed
      queryClient.setQueriesData<{ pages: PostWithDetails[][] }>(
        { queryKey: ['feed'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.map((post) =>
                post.id === postId
                  ? { ...post, comment_count: post.comment_count + 1 }
                  : post,
              ),
            ),
          }
        },
      )
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      const { error } = await supabase
        .from('post_comments')
        .update({ is_deleted: true })
        .eq('id', commentId)
      if (error) throw error
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Report post                                                        */
/* ------------------------------------------------------------------ */

export function useReportPost() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ contentId, contentType, reason }: {
      contentId: string
      contentType: string
      reason: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reason,
        })
      if (error) throw error
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Share post (native share sheet)                                     */
/* ------------------------------------------------------------------ */

export async function sharePost(post: PostWithDetails) {
  const text = post.content ?? ''
  const title = post.author?.display_name
    ? `${post.author.display_name} on Co-Exist`
    : 'Co-Exist Post'

  if (navigator.share) {
    try {
      await navigator.share({ title, text })
    } catch {
      // User cancelled or not supported
    }
  }
}
