import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/* ------------------------------------------------------------------ */
/*  CA3 finding 6.F4                                                   */
/*                                                                     */
/*  invoke, throw-on-error, cast: the same three lines at seven        */
/*  checkout mutation sites. Nothing varied except the body and the    */
/*  return shape, so the only thing the repetition bought was seven    */
/*  chances to forget the throw. No test covered any of them:          */
/*  `grep -rl "use-donations\|use-orders\|use-membership" src/test/`   */
/*  returned only membership-join-page.test.tsx, which exercises the   */
/*  page, not these hook bodies.                                        */
/* ------------------------------------------------------------------ */

const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }))
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn() }))

const { invokeCheckout } = await import('@/lib/stripe')

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')

beforeEach(() => invoke.mockReset())

describe('invokeCheckout', () => {
  it('calls the create-checkout function with the body verbatim', async () => {
    invoke.mockResolvedValue({ data: { url: 'https://checkout.test' }, error: null })
    await invokeCheckout({ type: 'donation', amount: 2500 })
    expect(invoke).toHaveBeenCalledWith('create-checkout', { body: { type: 'donation', amount: 2500 } })
  })

  it('returns the payload', async () => {
    invoke.mockResolvedValue({ data: { session_id: 'cs_1', url: 'https://c.test' }, error: null })
    await expect(invokeCheckout<{ session_id: string; url: string }>({ type: 'merch' }))
      .resolves.toEqual({ session_id: 'cs_1', url: 'https://c.test' })
  })

  // THE ONE BEHAVIOUR ALL SEVEN SITES SHARED, and the one a hand-written
  // eighth would be most likely to drop. A checkout that resolves instead of
  // throwing hands the caller `undefined` where it expects a URL, and the
  // member sees a dead button rather than an error.
  it('throws when the function returns an error', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('function boom') })
    await expect(invokeCheckout({ type: 'donation' })).rejects.toThrow('function boom')
  })

  it('does not swallow an error that arrives alongside data', async () => {
    invoke.mockResolvedValue({ data: { url: 'https://stale.test' }, error: new Error('late failure') })
    await expect(invokeCheckout({ type: 'membership' })).rejects.toThrow('late failure')
  })

  it('resolves rather than throwing for the cancellation types, which return no payload', async () => {
    invoke.mockResolvedValue({ data: null, error: null })
    // Both cancellation sites `await` this and discard the result, so the
    // contract is "does not throw", not a particular value. The Edge Function
    // hands back null for these, and the helper passes it through rather than
    // normalising it to undefined; asserting the real value here rather than
    // the tidier-looking one keeps the test describing what happens.
    await expect(invokeCheckout<void>({ type: 'cancel_membership', stripe_subscription_id: 'sub_1' }))
      .resolves.toBeNull()
  })
})

describe('the seven in-scope call sites are all on the helper', () => {
  const MIGRATED = ['src/hooks/use-donations.ts', 'src/hooks/use-orders.ts', 'src/hooks/use-membership.ts']

  for (const site of MIGRATED) {
    it(`${site} invokes create-checkout only through invokeCheckout`, () => {
      const body = read(site)
      expect(
        body,
        `${site} calls supabase.functions.invoke('create-checkout') directly again`,
      ).not.toMatch(/functions\.invoke\(\s*'create-checkout'/)
      expect(body).toMatch(/import \{ invokeCheckout \} from '@\/lib\/stripe'/)
    })
  }

  it('covers all seven mutations, so none was left behind', () => {
    const total = MIGRATED
      .map(read)
      .reduce((n, body) => n + Array.from(body.matchAll(/invokeCheckout</g)).length, 0)
    // 3 in use-donations (donation, cancel_subscription, billing_portal),
    // 1 in use-orders (merch), 3 in use-membership (membership,
    // cancel_membership, membership_portal).
    expect(total).toBe(7)
  })

  it('every checkout type the Edge Function serves is still requested', () => {
    const all = MIGRATED.map(read).join('\n')
    for (const type of [
      'donation', 'cancel_subscription', 'billing_portal',
      'merch', 'membership', 'cancel_membership', 'membership_portal',
    ]) {
      expect(all, `the ${type} checkout lost its type discriminator in the refactor`)
        .toMatch(new RegExp(`type: '${type}'`))
    }
  })

  // Ticketing's call site belongs to the spine audit and is deliberately NOT
  // migrated here. Asserted so a later reader can tell "left alone on purpose"
  // from "missed", and so a future lane moving it has to update this line.
  it('leaves the ticketing call site alone, which is spine territory', () => {
    expect(read('src/hooks/use-event-tickets.ts')).toMatch(/functions\.invoke\(\s*'create-checkout'/)
  })
})
