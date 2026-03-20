import { useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'

type NavMode = 'bottom-tabs' | 'sidebar'

interface LayoutInfo {
  /** Viewport < 640px */
  isMobile: boolean
  /** Viewport 640–1024px */
  isTablet: boolean
  /** Viewport > 1024px */
  isDesktop: boolean
  /** Running inside Capacitor native shell */
  isNative: boolean
  /** Running in a web browser */
  isWeb: boolean
  /** Which navigation mode to render */
  navMode: NavMode
}

const MOBILE_MAX = 640
const DESKTOP_MIN = 1024

let cachedSnapshot: LayoutInfo | null = null

function getSnapshot(): LayoutInfo {
  const w = window.innerWidth
  const isNative = Capacitor.isNativePlatform()
  const isMobile = w < MOBILE_MAX
  const isDesktop = w >= DESKTOP_MIN
  const isTablet = !isMobile && !isDesktop

  let navMode: NavMode = 'bottom-tabs'
  if ((isDesktop || isTablet) && !isNative) {
    navMode = 'sidebar'
  }

  if (
    cachedSnapshot &&
    cachedSnapshot.isMobile === isMobile &&
    cachedSnapshot.isTablet === isTablet &&
    cachedSnapshot.isDesktop === isDesktop &&
    cachedSnapshot.navMode === navMode
  ) {
    return cachedSnapshot
  }

  cachedSnapshot = { isMobile, isTablet, isDesktop, isNative, isWeb: !isNative, navMode }
  return cachedSnapshot
}

function getServerSnapshot(): LayoutInfo {
  return {
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isNative: false,
    isWeb: true,
    navMode: 'bottom-tabs',
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('resize', callback)
  return () => window.removeEventListener('resize', callback)
}

export function useLayout(): LayoutInfo {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
