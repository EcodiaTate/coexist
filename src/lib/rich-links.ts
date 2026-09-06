/* ------------------------------------------------------------------ */
/*  Markdown-lite link parsing for free-text announcement content      */
/*                                                                     */
/*  One parser. The member-facing Updates page and the admin authoring */
/*  preview each had their own copy of this regex and walk loop, and    */
/*  each had independently hit the same /g lastIndex footgun and fixed  */
/*  it a different way: one rebuilt the RegExp on every call, the other */
/*  reset lastIndex before use. Two people finding and patching the     */
/*  identical bug in two copies of the identical parser is the clearest */
/*  possible argument that it belongs in one file.                      */
/* ------------------------------------------------------------------ */

/**
 * `[label](url)` first, bare `http(s)://...` second.
 *
 * Kept as a SOURCE STRING, not a literal RegExp. A module-level `/g` regex
 * carries `lastIndex` between calls, so a second render starting mid-string
 * silently skips matches near the beginning of the text. Building a fresh
 * RegExp per parse makes that impossible rather than merely remembered.
 */
export const LINK_PATTERN_SOURCE = String.raw`\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)`

export type RichToken =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; label: string; bare: boolean }

/**
 * Split free text into plain runs and links.
 *
 * Pure and React-free so it can be tested directly. `bare` distinguishes a
 * naked URL (which both prior copies rendered with `break-all`) from a
 * labelled `[text](url)` link.
 */
export function parseRichLinks(text: string): RichToken[] {
  const tokens: RichToken[] = []
  if (!text) return tokens

  // Fresh per call. See LINK_PATTERN_SOURCE.
  const pattern = new RegExp(LINK_PATTERN_SOURCE, 'g')
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    if (match[1] && match[2]) {
      tokens.push({ type: 'link', href: match[2], label: match[1], bare: false })
    } else if (match[3]) {
      tokens.push({ type: 'link', href: match[3], label: match[3], bare: true })
    }

    lastIndex = match.index + match[0].length

    // A zero-length match would spin forever. The pattern cannot produce one
    // today (every alternative requires at least `http://`), but an edit to it
    // could, and an infinite loop in a render path is not a cheap mistake.
    if (match[0].length === 0) pattern.lastIndex++
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return tokens
}
