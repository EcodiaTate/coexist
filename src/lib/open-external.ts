import { Capacitor } from '@capacitor/core'

/**
 * Open a URL in the system browser (Safari/Chrome) on native,
 * or a new tab on web. Uses @capacitor/browser on native to ensure
 * SFSafariViewController / Chrome Custom Tabs are used.
 */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
  } else {
    window.open(url, '_blank')
  }
}
