import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

/**
 * Track the native keyboard height so fixed-position / flex-end elements
 * (bottom sheets, chat inputs) can offset themselves above the keyboard.
 *
 * Uses Capacitor Keyboard plugin events as the primary source (gives exact
 * keyboard height on both iOS and Android), with the Visual Viewport API
 * as a continuous refinement while the keyboard is open.
 *
 * Sets CSS custom property `--kb-height` on `<html>` so any element can use
 * `calc(... + var(--kb-height, 0px))` without needing the hook directly.
 *
 * Returns 0 on web or when keyboard is hidden.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let currentHeight = 0

    const setHeight = (h: number) => {
      currentHeight = h
      setKeyboardHeight(h)
      document.documentElement.style.setProperty('--kb-height', `${h}px`)
    }

    // Primary: Capacitor Keyboard plugin events (reliable on both platforms)
    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      setHeight(Math.round(info.keyboardHeight))
    })

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setHeight(0)
    })

    // Secondary: Visual Viewport API for continuous refinement
    // (handles keyboard height changes during autocomplete bar, etc.)
    const vv = window.visualViewport
    let vvUpdate: (() => void) | undefined

    if (vv) {
      vvUpdate = () => {
        const vvHeight = Math.max(0, Math.round(window.innerHeight - vv.height))
        // Only update if keyboard is known to be open (avoid false positives)
        // and the visual viewport gives a meaningful value
        if (currentHeight > 0 && vvHeight > 0) {
          setHeight(vvHeight)
        }
      }
      vv.addEventListener('resize', vvUpdate)
    }

    return () => {
      showListener.then((h) => h.remove())
      hideListener.then((h) => h.remove())
      if (vv && vvUpdate) {
        vv.removeEventListener('resize', vvUpdate)
      }
      document.documentElement.style.setProperty('--kb-height', '0px')
    }
  }, [])

  return keyboardHeight
}
