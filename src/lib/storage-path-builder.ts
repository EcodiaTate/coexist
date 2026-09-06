/**
 * Builds a unique Supabase Storage path for a given user.
 *
 * Pattern: `{userId}/{prefix}{timestamp}-{random}.{ext}`
 *
 * @param userId  - Supabase user ID (falls back to "anon")
 * @param prefix  - Optional sub-folder within the user's directory
 * @param ext     - File extension without dot (default "jpg")
 */

import { uniqueSuffix } from './unique-suffix'
export function buildStoragePath(
  userId: string | undefined,
  prefix?: string,
  ext = 'jpg',
): string {
  const uid = userId ?? 'anon'
  const dir = prefix ? `${prefix}/` : ''
  return `${uid}/${dir}${uniqueSuffix()}.${ext}`
}
