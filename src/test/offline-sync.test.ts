import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  queueOfflineCheckIn,
  getPendingCheckInCount,
  queueOfflineAction,
  getPendingActionCount,
  getPendingActions,
  saveChatDraft,
  getChatDraft,
  removeChatDraft,
  setLastSyncTime,
  getLastSyncTime,
  persistQueryCache,
  restoreQueryCache,
} from '@/lib/offline-sync'

describe('offline-sync', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('offline check-in queue', () => {
    it('queues a check-in', () => {
      expect(getPendingCheckInCount()).toBe(0)
      queueOfflineCheckIn('event-1', 'user-1')
      expect(getPendingCheckInCount()).toBe(1)
    })

    it('deduplicates identical check-ins', () => {
      queueOfflineCheckIn('event-1', 'user-1')
      queueOfflineCheckIn('event-1', 'user-1')
      expect(getPendingCheckInCount()).toBe(1)
    })

    it('queues different event/user combinations', () => {
      queueOfflineCheckIn('event-1', 'user-1')
      queueOfflineCheckIn('event-2', 'user-1')
      queueOfflineCheckIn('event-1', 'user-2')
      expect(getPendingCheckInCount()).toBe(3)
    })
  })

  describe('generic offline action queue', () => {
    it('queues an action and returns an id', () => {
      const id = queueOfflineAction('chat-message', { content: 'hello' })
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
    })

    it('increments pending action count', () => {
      expect(getPendingActionCount()).toBe(0)
      queueOfflineAction('chat-message', { content: 'hello' })
      expect(getPendingActionCount()).toBe(1)
    })

    it('returns pending actions', () => {
      queueOfflineAction('chat-message', { content: 'msg1' })
      queueOfflineAction('check-in', { eventId: 'e1' })
      const actions = getPendingActions()
      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe('chat-message')
      expect(actions[1].type).toBe('check-in')
    })

    it('combined count includes both queues', () => {
      queueOfflineCheckIn('event-1', 'user-1')
      queueOfflineAction('chat-message', { content: 'hello' })
      expect(getPendingActionCount()).toBe(2)
    })
  })

  describe('chat draft persistence', () => {
    it('saves and retrieves a draft', () => {
      saveChatDraft('col-1', 'Hello world')
      const draft = getChatDraft('col-1')
      expect(draft).not.toBeNull()
      expect(draft!.content).toBe('Hello world')
      expect(draft!.collectiveId).toBe('col-1')
    })

    it('saves draft with replyToId', () => {
      saveChatDraft('col-1', 'Reply text', 'msg-99')
      const draft = getChatDraft('col-1')
      expect(draft!.replyToId).toBe('msg-99')
    })

    it('returns null for unknown collective', () => {
      expect(getChatDraft('nonexistent')).toBeNull()
    })

    it('removes draft when content is empty/whitespace', () => {
      saveChatDraft('col-1', 'Hello')
      saveChatDraft('col-1', '   ')
      expect(getChatDraft('col-1')).toBeNull()
    })

    it('removes a draft', () => {
      saveChatDraft('col-1', 'Hello')
      removeChatDraft('col-1')
      expect(getChatDraft('col-1')).toBeNull()
    })
  })

  describe('last sync time', () => {
    it('returns null when never synced', () => {
      expect(getLastSyncTime()).toBeNull()
    })

    it('sets and gets sync time', () => {
      setLastSyncTime()
      const time = getLastSyncTime()
      expect(time).toBeTruthy()
      expect(new Date(time!).getTime()).toBeGreaterThan(0)
    })
  })

  describe('query cache persistence', () => {
    it('persists and restores cache', () => {
      const state = { queries: [{ key: 'test', data: 42 }] }
      persistQueryCache(state)
      const restored = restoreQueryCache()
      expect(restored).toEqual(state)
    })

    it('returns null when no cache exists', () => {
      expect(restoreQueryCache()).toBeNull()
    })

    it('returns null for corrupted cache', () => {
      localStorage.setItem('coexist-query-cache', 'not-json{{{')
      expect(restoreQueryCache()).toBeNull()
    })
  })
})
