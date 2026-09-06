import { useRef, type RefObject } from 'react'

/* ------------------------------------------------------------------ */
/*  useLiveFieldValue - read what is ACTUALLY in the input right now.   */
/*                                                                     */
/*  iOS autocorrect keeps a one-word entry (a first name, a suburb) in  */
/*  an OPEN IME composition until a space or punctuation is typed or    */
/*  the field blurs, and the shared <Input> deliberately withholds its  */
/*  upward onChange during composition to protect the Android GBoard    */
/*  buffer (see input.tsx). So at the instant a user taps Continue the  */
/*  parent's React value can still be empty while the field visibly     */
/*  holds their name. With the button disabled on that empty value the  */
/*  tap was eaten, which is the "I typed my name but can't continue"    */
/*  report from Co-Exist Vic, iPhone, 2026-07-26.                       */
/*                                                                     */
/*  The fix is never to disable on the React value, and to read the     */
/*  LIVE DOM value on submit, flushing it upward before advancing. That */
/*  pattern was written into step-name-handle.tsx and step-phone.tsx    */
/*  and NOT into profile/edit-profile.tsx, which edits the same two      */
/*  fields. This hook is that pattern once, so the next surface to ask  */
/*  for a name or a phone gets the fix by construction.                 */
/* ------------------------------------------------------------------ */

/**
 * Returns a TUPLE rather than an object on purpose: destructured to a bare
 * identifier, `ref` passes react-hooks/refs, while `holder.ref` in JSX reads to
 * that rule as touching a ref during render.
 */
export function useLiveFieldValue<T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>(
  value: string,
): [RefObject<T | null>, () => string] {
  const ref = useRef<T>(null)
  return [ref, () => (ref.current?.value ?? value).trim()]
}
