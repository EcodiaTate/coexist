/**
 * Build a chat-images storage path that satisfies the bucket RLS.
 *
 * Bucket policy (storage/0031): the path's first folder must match either
 * a collective_id the caller is a member of, or a channel_id the caller is
 * a member of. Second folder must equal the caller's user id.
 *
 *   {context_id}/{user_id}/{ts}-{rand}.{ext}
 *
 * The render layer signs on demand via useSignedChatImage(path).
 */

import { uniqueSuffix } from './unique-suffix'
export function buildChatImagePath(
  contextId: string,
  userId: string,
  ext = 'jpg',
): string {
  return `${contextId}/${userId}/${uniqueSuffix()}.${ext}`
}
