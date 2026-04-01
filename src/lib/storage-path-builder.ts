/**
 * Builds a unique Supabase Storage path for a given user.
 *
 * Pattern: `{userId}/{prefix}{timestamp}-{random}.{ext}`
 *
 * @param userId  - Supabase user ID (falls back to "anon")
 * @param prefix  - Optional sub-folder within the user's directory
 * @param ext     - File extension without dot (default "jpg")
 */
export function buildStoragePath(
  userId: string | undefined,
  prefix?: string,
  ext = 'jpg',
): string {
  const uid = userId ?? 'anon'
  const dir = prefix ? `${prefix}/` : ''
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `${uid}/${dir}${ts}-${rand}.${ext}`
}
