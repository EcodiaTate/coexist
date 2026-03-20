import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PendingCheckIn {
  eventId: string
  userId: string
  timestamp: string
}

export interface OfflineAction {
  id: string
  type: 'check-in' | 'chat-message'
  payload: Record<string, unknown>
  createdAt: string
  retries: number
}

export interface ChatDraft {
  collectiveId: string
  content: string
  replyToId?: string
  updatedAt: string
}

export interface SyncResult {
  synced: number
  failed: number
  conflicts: string[]
}

/* ------------------------------------------------------------------ */
/*  Storage keys                                                       */
/* ------------------------------------------------------------------ */

const QUEUE_KEY = 'coexist-offline-checkin-queue'
const ACTION_QUEUE_KEY = 'coexist-offline-action-queue'
const DRAFT_KEY = 'coexist-chat-drafts'
const CACHE_KEY = 'coexist-query-cache'
const LAST_SYNC_KEY = 'coexist-last-sync'

/* ------------------------------------------------------------------ */
/*  Generic helpers                                                    */
/* ------------------------------------------------------------------ */

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full — silently skip
  }
}

/* ------------------------------------------------------------------ */
/*  Offline check-in queue (legacy, still used by check-in page)       */
/* ------------------------------------------------------------------ */

function getQueue(): PendingCheckIn[] {
  return safeGet<PendingCheckIn[]>(QUEUE_KEY, [])
}

function saveQueue(queue: PendingCheckIn[]) {
  safeSet(QUEUE_KEY, queue)
}

/** Add a check-in to the offline queue */
export function queueOfflineCheckIn(eventId: string, userId: string) {
  const queue = getQueue()
  if (queue.some((q) => q.eventId === eventId && q.userId === userId)) return
  queue.push({ eventId, userId, timestamp: new Date().toISOString() })
  saveQueue(queue)
}

/** Sync all queued check-ins to Supabase. Returns number successfully synced. */
export async function syncOfflineCheckIns(): Promise<number> {
  const queue = getQueue()
  if (queue.length === 0) return 0

  let synced = 0
  const remaining: PendingCheckIn[] = []

  for (const item of queue) {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'attended', checked_in_at: item.timestamp })
      .eq('event_id', item.eventId)
      .eq('user_id', item.userId)

    if (error) {
      remaining.push(item)
    } else {
      synced++
    }
  }

  saveQueue(remaining)
  return synced
}

/** How many check-ins are waiting to be synced */
export function getPendingCheckInCount(): number {
  return getQueue().length
}

/* ------------------------------------------------------------------ */
/*  Generic offline action queue                                       */
/* ------------------------------------------------------------------ */

function getActionQueue(): OfflineAction[] {
  return safeGet<OfflineAction[]>(ACTION_QUEUE_KEY, [])
}

function saveActionQueue(queue: OfflineAction[]) {
  safeSet(ACTION_QUEUE_KEY, queue)
}

/** Queue any offline action */
export function queueOfflineAction(
  type: OfflineAction['type'],
  payload: Record<string, unknown>,
) {
  const queue = getActionQueue()
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  queue.push({ id, type, payload, createdAt: new Date().toISOString(), retries: 0 })
  saveActionQueue(queue)
  return id
}

/** Get count of all pending offline actions (check-ins + generic) */
export function getPendingActionCount(): number {
  return getPendingCheckInCount() + getActionQueue().length
}

/** Get all pending actions for UI display */
export function getPendingActions(): OfflineAction[] {
  return getActionQueue()
}

const MAX_RETRIES = 3

/** Process a single action. Returns true if synced, false if failed. */
async function processAction(action: OfflineAction): Promise<{ ok: boolean; conflict?: string }> {
  switch (action.type) {
    case 'chat-message': {
      const { collectiveId, userId, content, replyToId } = action.payload as {
        collectiveId: string
        userId: string
        content: string
        replyToId?: string
      }
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          collective_id: collectiveId,
          user_id: userId,
          content,
          reply_to_id: replyToId ?? null,
        })
      if (error) {
        // 409 or unique constraint = conflict (e.g. user was removed from collective)
        if (error.code === '23503' || error.code === '42501') {
          return { ok: false, conflict: `Message to collective could not be sent: ${error.message}` }
        }
        return { ok: false }
      }
      return { ok: true }
    }

    case 'check-in': {
      const { eventId, userId, timestamp } = action.payload as {
        eventId: string
        userId: string
        timestamp: string
      }
      // Check if already checked in (server wins)
      const { data: existing } = await supabase
        .from('event_registrations')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single()

      if (existing?.status === 'attended') {
        return { ok: true } // Already done — no conflict
      }

      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'attended', checked_in_at: timestamp })
        .eq('event_id', eventId)
        .eq('user_id', userId)

      if (error) {
        return { ok: false, conflict: `Check-in sync failed: ${error.message}` }
      }
      return { ok: true }
    }

    default:
      return { ok: false, conflict: `Unknown action type: ${action.type}` }
  }
}

/** Sync all pending actions. Server wins on conflicts, notifies user. */
export async function syncAllOfflineActions(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, conflicts: [] }

  // Sync legacy check-in queue first
  const checkinsSynced = await syncOfflineCheckIns()
  result.synced += checkinsSynced

  // Sync generic action queue
  const queue = getActionQueue()
  if (queue.length === 0) return result

  const remaining: OfflineAction[] = []

  for (const action of queue) {
    const { ok, conflict } = await processAction(action)
    if (ok) {
      result.synced++
    } else if (conflict) {
      result.conflicts.push(conflict)
      // Don't retry conflicts — server wins
    } else if (action.retries < MAX_RETRIES) {
      remaining.push({ ...action, retries: action.retries + 1 })
      result.failed++
    } else {
      result.conflicts.push(`Action ${action.type} failed after ${MAX_RETRIES} retries`)
    }
  }

  saveActionQueue(remaining)
  return result
}

/* ------------------------------------------------------------------ */
/*  Chat draft persistence                                             */
/* ------------------------------------------------------------------ */

function getDrafts(): Record<string, ChatDraft> {
  return safeGet<Record<string, ChatDraft>>(DRAFT_KEY, {})
}

function saveDrafts(drafts: Record<string, ChatDraft>) {
  safeSet(DRAFT_KEY, drafts)
}

/** Save a chat message draft (persists across sessions) */
export function saveChatDraft(collectiveId: string, content: string, replyToId?: string) {
  if (!content.trim()) {
    removeChatDraft(collectiveId)
    return
  }
  const drafts = getDrafts()
  drafts[collectiveId] = {
    collectiveId,
    content,
    replyToId,
    updatedAt: new Date().toISOString(),
  }
  saveDrafts(drafts)
}

/** Get a saved draft for a collective */
export function getChatDraft(collectiveId: string): ChatDraft | null {
  const drafts = getDrafts()
  return drafts[collectiveId] ?? null
}

/** Remove a draft (after sending) */
export function removeChatDraft(collectiveId: string) {
  const drafts = getDrafts()
  delete drafts[collectiveId]
  saveDrafts(drafts)
}

/* ------------------------------------------------------------------ */
/*  Last sync timestamp                                                */
/* ------------------------------------------------------------------ */

export function setLastSyncTime() {
  safeSet(LAST_SYNC_KEY, new Date().toISOString())
}

export function getLastSyncTime(): string | null {
  return safeGet<string | null>(LAST_SYNC_KEY, null)
}

/* ------------------------------------------------------------------ */
/*  Auto-sync on reconnect                                             */
/* ------------------------------------------------------------------ */

let syncListenerAttached = false
let onSyncComplete: ((result: SyncResult) => void) | null = null

/** Register a callback for when sync completes (used by the sync provider) */
export function onSyncResult(callback: (result: SyncResult) => void) {
  onSyncComplete = callback
}

/**
 * Attaches a one-time listener that syncs all offline actions
 * when the browser comes back online. Safe to call multiple times.
 */
export function attachOfflineSyncListener() {
  if (syncListenerAttached) return
  syncListenerAttached = true

  window.addEventListener('online', async () => {
    const result = await syncAllOfflineActions()
    setLastSyncTime()
    onSyncComplete?.(result)
  })
}

/* ------------------------------------------------------------------ */
/*  TanStack Query persistence helpers                                 */
/* ------------------------------------------------------------------ */

/** Persist a serialized TanStack Query cache to localStorage */
export function persistQueryCache(dehydratedState: unknown) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dehydratedState))
  } catch {
    // Storage full or unavailable — silently skip
  }
}

/** Restore a previously persisted query cache */
export function restoreQueryCache(): unknown | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
