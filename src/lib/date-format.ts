/**
 * Centralised date and time formatting utilities.
 */

/** "Wed 2 Apr" */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "2 Apr 2025" (year always shown) */
export function formatDateLong(dateStr: string, showYear = true): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: showYear ? 'numeric' : undefined,
  })
}

/** "2 Apr" (no weekday, no year) */
export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  })
}

/** "3:45 pm" */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

/** Relative: "Just now", "5m ago", "2h ago", "3d ago", or falls back to formatDateLong */
export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return formatDateLong(dateStr, diff > 31536000)
}

/** Days from now until dateStr (negative = past) */
export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ---------------------------------------------------------------------------
// Aliases kept for call-site compatibility
// ---------------------------------------------------------------------------

/** @deprecated use formatDate */
export const formatEventDate = formatDate
/** @deprecated use formatDate */
export const formatCardDate = formatDate
/** @deprecated use formatTime */
export const formatEventTime = formatTime
/** @deprecated use formatTime */
export const formatCardTime = formatTime
/** @deprecated use formatDateLong */
export const formatDateTime = formatDateLong
