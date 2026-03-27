/**
 * Sanitize Supabase/Postgres error messages before showing to users.
 * Strips table names, column names, constraint details, and RLS policy text.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.'

  const msg = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error)

  // If it looks like a Postgres/PostgREST internal error, replace with generic message
  if (
    msg.includes('violates') ||
    msg.includes('constraint') ||
    msg.includes('relation') ||
    msg.includes('column') ||
    msg.includes('policy') ||
    msg.includes('permission denied') ||
    msg.includes('PGRST') ||
    msg.includes('operator does not exist')
  ) {
    return 'Something went wrong. Please try again.'
  }

  // Auth errors from Supabase are generally safe to show
  // Rate limit messages are safe
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.'
  }

  // Generic network errors
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
    return 'Network error. Please check your connection and try again.'
  }

  // If it's a short, simple message, it's probably safe to show
  if (msg.length < 100 && !msg.includes('_') && !msg.includes('fkey')) {
    return msg
  }

  return 'Something went wrong. Please try again.'
}
