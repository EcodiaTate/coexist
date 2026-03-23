import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

function isTextInput(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) {
    const type = el.type
    // Only scroll for text-like inputs, not checkboxes/radios/files/hidden
    return (
      type === 'text' ||
      type === 'email' ||
      type === 'password' ||
      type === 'search' ||
      type === 'tel' ||
      type === 'url' ||
      type === 'number' ||
      type === 'date' ||
      type === 'datetime-local' ||
      type === 'time'
    )
  }
  if (el.getAttribute('contenteditable') === 'true') return true
  return false
}

function scrollFocusedIntoView() {
  const el = document.activeElement
  if (!isTextInput(el)) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/**
 * Listens for native keyboard show/hide events and scrolls the
 * focused input into view so it isn't hidden behind the keyboard.
 *
 * On native: uses Capacitor Keyboard plugin events.
 * Also listens for focusin on text inputs to handle field-switching
 * while the keyboard is already open.
 */
export function useKeyboard() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // When keyboard appears, scroll the focused element into view
    const onKeyboardShow = () => {
      setTimeout(scrollFocusedIntoView, 120)
    }

    const showListener = Keyboard.addListener('keyboardWillShow', onKeyboardShow)
    const didShowListener = Keyboard.addListener('keyboardDidShow', onKeyboardShow)

    // Also handle focus changes (e.g. tapping a different input while keyboard is open)
    const onFocusIn = (e: FocusEvent) => {
      if (!isTextInput(e.target as Element)) return
      // Delay to allow keyboard + layout to settle
      setTimeout(() => {
        ;(e.target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
    }

    document.addEventListener('focusin', onFocusIn, { passive: true })

    return () => {
      showListener.then((h) => h.remove())
      didShowListener.then((h) => h.remove())
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [])
}
