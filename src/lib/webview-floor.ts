/* ------------------------------------------------------------------ */
/*  WebView CSS floor detection                                        */
/*                                                                     */
/*  The app is styled with Tailwind v4, whose generated stylesheet     */
/*  relies on modern CSS: oklch() colours, color-mix(), @property and  */
/*  cascade layers. Those land at ~Chrome 111 / Safari 16.4. On an     */
/*  older engine (e.g. an update-starved Android System WebView at     */
/*  Chrome 91) the stylesheet largely fails to apply: position:fixed   */
/*  utilities drop, dvh units are unsupported, and the layout grows to */
/*  a ~21,000px document with the phone gate and nav rendered far      */
/*  off-screen. The 2026-07-05 build-target + polyfill fix cured the   */
/*  JS syntax/API crash class but does NOT touch CSS, so below the CSS */
/*  floor the app still renders broken.                                */
/*                                                                     */
/*  isWebViewBelowFloor() probes two features that map to exactly the  */
/*  Tailwind v4 floor. When either is missing we show a plain,         */
/*  old-WebView-safe upgrade screen instead of mounting the app (see   */
/*  src/main.tsx) so a broken layout never reaches the user.           */
/* ------------------------------------------------------------------ */

export function isWebViewBelowFloor(): boolean {
  try {
    if (typeof window === 'undefined' || !window.CSS || typeof CSS.supports !== 'function') {
      // No CSS.supports at all -> engine far below the floor.
      return true
    }
    const hasOklch = CSS.supports('color', 'oklch(0.7 0.1 200)')
    const hasColorMix = CSS.supports('color', 'color-mix(in oklch, white, black)')
    return !(hasOklch && hasColorMix)
  } catch {
    // If probing itself throws, the engine is ancient -> treat as below floor.
    return true
  }
}
