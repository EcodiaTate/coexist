import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { useResetOnClose } from '@/hooks/use-reset-on-close'
import { SHEET_ANIM_MS } from '@/components/bottom-sheet'

/* ------------------------------------------------------------------ */
/*  CA3 finding 4.F3. One reset-on-close, importing the real constant.  */
/*                                                                      */
/*  Three sheets each ran their own useEffect with a hard-coded          */
/*  setTimeout(reset, 300). The 300 was never arbitrary: it exists to    */
/*  outlive BottomSheet's own close animation, whose duration is the     */
/*  named constant SHEET_ANIM_MS in that same primitive. Nothing         */
/*  imported that constant, so changing the animation would have left    */
/*  three reset timers pointing at the old number and the fields would   */
/*  have blanked in front of the user mid-slide.                         */
/* ------------------------------------------------------------------ */

const SRC = path.resolve(__dirname, '../../components')

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useResetOnClose', () => {
  it('does not reset while the sheet is open', () => {
    const reset = vi.fn()
    renderHook(({ open }) => useResetOnClose(open, reset), { initialProps: { open: true } })
    act(() => void vi.advanceTimersByTime(5000))
    expect(reset).not.toHaveBeenCalled()
  })

  it('resets only AFTER the close animation has finished', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ open }) => useResetOnClose(open, reset), {
      initialProps: { open: true },
    })
    rerender({ open: false })
    // one tick short of the animation: the fields must still be on screen
    act(() => void vi.advanceTimersByTime(SHEET_ANIM_MS - 1))
    expect(reset).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(1))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('defaults to the primitive\'s own animation duration, not a copied literal', () => {
    // If BottomSheet's animation is ever retuned, this hook moves with it.
    // That coupling is the whole finding, so it is asserted rather than assumed.
    const reset = vi.fn()
    renderHook(() => useResetOnClose(false, reset))
    act(() => void vi.advanceTimersByTime(SHEET_ANIM_MS - 1))
    expect(reset).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(1))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending reset if the sheet re-opens first', () => {
    const reset = vi.fn()
    const { rerender } = renderHook(({ open }) => useResetOnClose(open, reset), {
      initialProps: { open: true },
    })
    rerender({ open: false })
    act(() => void vi.advanceTimersByTime(SHEET_ANIM_MS - 50))
    rerender({ open: true })
    act(() => void vi.advanceTimersByTime(5000))
    expect(reset).not.toHaveBeenCalled()
  })

  it('a re-render while closed does not restart the timer', () => {
    // Every call site passes an inline arrow, so `reset` is a new function on
    // every render. Depending on it would clear and restart the timer each
    // time, and a sheet that re-renders while closed would never reset at all.
    const spy = vi.fn()
    const { rerender } = renderHook(
      ({ open, n }: { open: boolean; n: number }) => useResetOnClose(open, () => spy(n)),
      { initialProps: { open: true, n: 0 } },
    )
    rerender({ open: false, n: 1 })
    act(() => void vi.advanceTimersByTime(SHEET_ANIM_MS - 50))
    rerender({ open: false, n: 2 }) // a fresh arrow, mid-flight
    act(() => void vi.advanceTimersByTime(50))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('fires the LATEST callback, not the one captured when the timer started', () => {
    // The ref is what makes a stale closure impossible. Without it the timer
    // would call whichever setters existed when the sheet closed.
    const spy = vi.fn()
    const { rerender } = renderHook(
      ({ open, n }: { open: boolean; n: number }) => useResetOnClose(open, () => spy(n)),
      { initialProps: { open: true, n: 0 } },
    )
    rerender({ open: false, n: 1 })
    rerender({ open: false, n: 2 })
    act(() => void vi.advanceTimersByTime(SHEET_ANIM_MS))
    expect(spy).toHaveBeenCalledWith(2)
  })

  it('clears the timer on unmount rather than resetting a gone sheet', () => {
    const reset = vi.fn()
    const { unmount } = renderHook(() => useResetOnClose(false, reset))
    unmount()
    act(() => void vi.advanceTimersByTime(5000))
    expect(reset).not.toHaveBeenCalled()
  })

  it('no sheet keeps a hard-coded 300ms reset timer', () => {
    // The finding's own probe, run against source. A behavioural suite alone
    // would stay green while a fourth copy of the literal grew back.
    for (const f of ['create-announcement-sheet.tsx', 'create-carpool-sheet.tsx', 'create-poll-sheet.tsx']) {
      const src = readFileSync(path.join(SRC, f), 'utf8')
      expect(src, `${f} still hard-codes the close delay`).not.toMatch(/,\s*300\)/)
      expect(src, `${f} does not use the shared hook`).toContain('useResetOnClose')
    }
  })

  it('the hook\'s default IS the primitive\'s constant, not a number that happens to match', () => {
    // Deliberately NOT `expect(SHEET_ANIM_MS).toBe(300)`. Pinning the value
    // would send this suite red the day someone legitimately retunes the
    // animation, which says nothing about the coupling and is the false alarm
    // this case exists to avoid. What must hold is that the two move together.
    const sheet = readFileSync(path.join(SRC, 'bottom-sheet.tsx'), 'utf8')
    expect(sheet, 'the constant must be exported or nothing can import it').toContain(
      'export const SHEET_ANIM_MS',
    )
    const hook = readFileSync(
      path.resolve(__dirname, '../../hooks/use-reset-on-close.ts'),
      'utf8',
    )
    expect(hook).toContain('delay: number = SHEET_ANIM_MS')
    expect(hook, 'the default must not be a copied literal').not.toMatch(
      /delay:\s*number\s*=\s*\d/,
    )
  })
})
