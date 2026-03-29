import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Track the native keyboard height using the visual viewport API.
 *
 * On iOS (Capacitor), `position: fixed` elements sit relative to the
 * layout viewport which does NOT shrink when the keyboard appears.
 * This hook returns the keyboard height so fixed-position elements
 * (bottom sheets, chat inputs) can offset themselves.
 *
 * Also sets CSS custom property `--kb-height` on `<html>` so any
 * element can use `calc(... + var(--kb-height, 0px))` without
 * needing the hook directly.
 *
 * Returns 0 on web or when keyboard is hidden.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      // The keyboard height is the gap between the full window and the
      // visual viewport. On iOS the visual viewport shrinks when the
      // keyboard appears.
      const kbHeight = Math.max(0, Math.round(window.innerHeight - vv.height))
      setKeyboardHeight(kbHeight)
      document.documentElement.style.setProperty('--kb-height', `${kbHeight}px`)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      document.documentElement.style.setProperty('--kb-height', '0px')
    }
  }, [])

  return keyboardHeight
}
