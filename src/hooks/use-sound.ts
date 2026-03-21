import { useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

type SoundName =
  | 'check-in'
  | 'send-message'
  | 'message-received'
  | 'error'
  | 'tier-up'
  | 'points'
  | 'tap'
  | 'success'
  | 'pull-refresh'
  | 'celebration'

interface UseSoundOptions {
  volume?: number
}

const SOUND_FILES: Record<SoundName, string> = {
  'check-in': '/assets/sounds/check-in.wav',
  'send-message': '/assets/sounds/send-message.wav',
  'message-received': '/assets/sounds/message-received.wav',
  'error': '/assets/sounds/error.wav',
  'tier-up': '/assets/sounds/tier-up.wav',
  'points': '/assets/sounds/points.wav',
  'tap': '/assets/sounds/tap.wav',
  'success': '/assets/sounds/success.wav',
  'pull-refresh': '/assets/sounds/pull-refresh.wav',
  'celebration': '/assets/sounds/celebration.wav',
}

// Lazy-loaded audio context
let audioCtx: AudioContext | null = null
const bufferCache = new Map<string, AudioBuffer>()

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  return audioCtx
}

async function loadSound(url: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(url)) return bufferCache.get(url)!
  const ctx = getAudioContext()
  if (!ctx) return null

  try {
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    bufferCache.set(url, audioBuffer)
    return audioBuffer
  } catch {
    return null
  }
}

/** Check if sounds should be played (respects system mute) */
function isSoundEnabled(): boolean {
  try {
    const setting = localStorage.getItem('coexist-sounds-enabled')
    return setting !== 'false'
  } catch {
    return true
  }
}

export function useSound() {
  const lastPlayedRef = useRef<number>(0)

  const play = useCallback(async (name: SoundName, opts?: UseSoundOptions) => {
    // Throttle: min 50ms between plays
    const now = Date.now()
    if (now - lastPlayedRef.current < 50) return
    lastPlayedRef.current = now

    if (!isSoundEnabled()) return

    const url = SOUND_FILES[name]
    if (!url) return

    // Play sound via Web Audio API
    const ctx = getAudioContext()
    if (!ctx) return

    // Resume suspended audio context (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    const buffer = await loadSound(url)
    if (!buffer) return

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const gainNode = ctx.createGain()
    gainNode.gain.value = opts?.volume ?? 0.5
    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(0)
  }, [])

  const playWithHaptic = useCallback(
    async (
      name: SoundName,
      hapticStyle: 'light' | 'medium' | 'heavy' = 'light',
    ) => {
      // Play sound
      play(name)

      // Trigger haptic if on native
      if (Capacitor.isNativePlatform()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
          const styleMap = {
            light: ImpactStyle.Light,
            medium: ImpactStyle.Medium,
            heavy: ImpactStyle.Heavy,
          }
          await Haptics.impact({ style: styleMap[hapticStyle] })
        } catch {
          // Haptics not available
        }
      }
    },
    [play],
  )

  const setSoundEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem('coexist-sounds-enabled', String(enabled))
    } catch {
      // Storage not available
    }
  }, [])

  return { play, playWithHaptic, setSoundEnabled, isSoundEnabled }
}
