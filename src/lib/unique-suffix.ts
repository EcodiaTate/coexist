/**
 * The one `<timestamp>-<random>` suffix used to keep a written key unique.
 *
 * This was written out nine times across the tree (CA3 finding 5a.F5): twice
 * inside the two storage-path builders that exist precisely to centralise
 * path construction, and seven more times beside them. The copies had already
 * drifted on random length (4, 6, 7 and unbounded), which is why the length
 * is a parameter here rather than a constant: every adopted call site keeps
 * the exact suffix shape it shipped with, so this consolidation changes no
 * stored key.
 *
 * Timestamp first is deliberate and load-bearing at the storage sites: it
 * makes a bucket listing sort chronologically without reading any metadata.
 *
 * Not a uniqueness GUARANTEE. Two writes inside the same millisecond collide
 * with probability 36^-len. That is fine for a per-user storage path and for
 * an optimistic client id replaced on server ack, and it is not fine for
 * anything needing a real key: use crypto.randomUUID() there.
 */
export function uniqueSuffix(randLen = 6): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 2 + randLen)}`
}
