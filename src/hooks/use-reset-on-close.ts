import { useEffect, useRef } from 'react'
import { SHEET_ANIM_MS } from '@/components/bottom-sheet'

/**
 * Reset a sheet's form fields once it has finished sliding away.
 *
 * Three sheets each ran their own `useEffect` with a hard-coded
 * `setTimeout(reset, 300)` (CA3 finding 4.F3). The 300 was never arbitrary: it
 * exists to outlive `BottomSheet`'s own close animation, whose duration is the
 * named constant `SHEET_ANIM_MS` in that same primitive. Nothing imported that
 * constant, so shortening or lengthening the animation would have left three
 * reset timers pointing at the old number, and the fields would have blanked
 * in front of the user mid-slide.
 *
 * The reset callback is held in a ref rather than listed as a dependency. Every
 * call site passes an inline arrow that closes over that sheet's setters, so it
 * is a new function on every render; depending on it would clear and restart
 * the timer on each render while the sheet is closed, which is the reset never
 * firing at all rather than firing late. The effect therefore keys on `open`
 * and `delay` only, and the ref keeps the callback current.
 *
 * The ref is synced in its own effect rather than assigned during render.
 * Writing a ref during render is what `react-hooks/refs` flags, and effects run
 * in declaration order, so this one lands before the timer effect on the render
 * where `open` flips false.
 */
export function useResetOnClose(open: boolean, reset: () => void, delay: number = SHEET_ANIM_MS) {
  const resetRef = useRef(reset)
  useEffect(() => {
    resetRef.current = reset
  })

  useEffect(() => {
    if (open) return
    const t = setTimeout(() => resetRef.current(), delay)
    return () => clearTimeout(t)
  }, [open, delay])
}
