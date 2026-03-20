#!/usr/bin/env node
/**
 * Generate placeholder sound effects for Co-Exist app (§56).
 * Run: node scripts/generate-sounds.mjs
 *
 * Creates 11 tiny WAV files in src/assets/sounds/.
 * Each is <50KB, synthesised from simple waveforms.
 *
 * Replace these with professionally designed sounds when available -
 * these are functional placeholders that match the described feel.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'src', 'assets', 'sounds')

mkdirSync(OUT_DIR, { recursive: true })

// --- WAV encoding helpers ---

function encodeWav(samples, sampleRate = 44100) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)        // chunk size
  view.setUint16(20, 1, true)         // PCM
  view.setUint16(22, 1, true)         // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)         // block align
  view.setUint16(34, 16, true)        // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s * 0x7fff, true)
  }

  return Buffer.from(buffer)
}

// --- Synthesis primitives ---

function sine(freq, duration, sr = 44100) {
  const len = Math.floor(sr * duration)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = Math.sin(2 * Math.PI * freq * i / sr)
  }
  return out
}

function envelope(samples, attack, decay, sustain, release) {
  const sr = 44100
  const len = samples.length
  const a = Math.floor(attack * sr)
  const d = Math.floor(decay * sr)
  const r = Math.floor(release * sr)
  const s = len - a - d - r

  for (let i = 0; i < len; i++) {
    let gain = 1
    if (i < a) gain = i / a
    else if (i < a + d) gain = 1 - (1 - sustain) * ((i - a) / d)
    else if (i < a + d + Math.max(0, s)) gain = sustain
    else gain = sustain * (1 - (i - a - d - Math.max(0, s)) / r)
    samples[i] *= Math.max(0, gain)
  }
  return samples
}

function mix(...arrays) {
  const len = Math.max(...arrays.map(a => a.length))
  const out = new Float32Array(len)
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      out[i] += arr[i] / arrays.length
    }
  }
  return out
}

function concat(...arrays) {
  const len = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Float32Array(len)
  let offset = 0
  for (const arr of arrays) {
    out.set(arr, offset)
    offset += arr.length
  }
  return out
}

function gain(samples, vol) {
  const out = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * vol
  return out
}

function silence(duration, sr = 44100) {
  return new Float32Array(Math.floor(sr * duration))
}

// --- Sound definitions (§56.2–56.11) ---

const sounds = {
  // §56.2 Check-in success - wooden chime ding
  'check-in': () => {
    const s = mix(
      envelope(sine(880, 0.3), 0.001, 0.05, 0.3, 0.2),
      envelope(sine(1320, 0.25), 0.001, 0.04, 0.2, 0.2),
      gain(envelope(sine(1760, 0.2), 0.001, 0.03, 0.15, 0.15), 0.5),
    )
    return gain(s, 0.7)
  },

  // §56.3 Badge unlock - bright ascending tone
  'badge-unlock': () => {
    const n1 = envelope(sine(523, 0.1), 0.001, 0.02, 0.5, 0.05)
    const n2 = envelope(sine(659, 0.1), 0.001, 0.02, 0.5, 0.05)
    const n3 = envelope(sine(784, 0.1), 0.001, 0.02, 0.5, 0.05)
    const n4 = envelope(sine(1047, 0.2), 0.001, 0.03, 0.4, 0.15)
    return gain(concat(n1, n2, n3, n4), 0.6)
  },

  // §56.4 Points awarded - ascending xylophone
  'points': () => {
    const n1 = envelope(sine(698, 0.08), 0.001, 0.01, 0.4, 0.05)
    const n2 = envelope(sine(880, 0.08), 0.001, 0.01, 0.4, 0.05)
    const n3 = envelope(sine(1047, 0.12), 0.001, 0.02, 0.4, 0.08)
    return gain(concat(n1, n2, n3), 0.5)
  },

  // §56.5 Tier up - ascending chord, ~0.7s (under 50KB)
  'tier-up': () => {
    const chord1 = mix(
      envelope(sine(523, 0.18), 0.005, 0.03, 0.5, 0.1),
      envelope(sine(659, 0.18), 0.005, 0.03, 0.5, 0.1),
      envelope(sine(784, 0.18), 0.005, 0.03, 0.5, 0.1),
    )
    const chord2 = mix(
      envelope(sine(587, 0.18), 0.005, 0.03, 0.5, 0.1),
      envelope(sine(740, 0.18), 0.005, 0.03, 0.5, 0.1),
      envelope(sine(880, 0.18), 0.005, 0.03, 0.5, 0.1),
    )
    const chord3 = mix(
      envelope(sine(659, 0.18), 0.005, 0.03, 0.4, 0.12),
      envelope(sine(784, 0.18), 0.005, 0.03, 0.4, 0.12),
      envelope(sine(1047, 0.18), 0.005, 0.03, 0.4, 0.12),
    )
    return gain(concat(chord1, silence(0.02), chord2, silence(0.02), chord3), 0.5)
  },

  // §56.6 Message sent - soft whoosh
  'send-message': () => {
    const sr = 44100
    const dur = 0.25
    const len = Math.floor(sr * dur)
    const out = new Float32Array(len)
    for (let i = 0; i < len; i++) {
      const t = i / sr
      const freq = 200 + t * 2000  // rising frequency = whoosh
      const noise = (Math.random() * 2 - 1) * 0.3
      out[i] = (Math.sin(2 * Math.PI * freq * t) * 0.3 + noise) * (1 - t / dur)
    }
    return gain(out, 0.4)
  },

  // §56.7 Message received - gentle pop
  'message-received': () => {
    const sr = 44100
    const dur = 0.12
    const len = Math.floor(sr * dur)
    const out = new Float32Array(len)
    for (let i = 0; i < len; i++) {
      const t = i / sr
      const freq = 600 - t * 1500  // falling = pop
      out[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 25)
    }
    return gain(out, 0.6)
  },

  // §56.8 Pull-to-refresh - soft click
  'pull-refresh': () => {
    const sr = 44100
    const dur = 0.06
    const len = Math.floor(sr * dur)
    const out = new Float32Array(len)
    for (let i = 0; i < len; i++) {
      const t = i / sr
      out[i] = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 60)
    }
    return gain(out, 0.5)
  },

  // §56.9 Error - low brief bonk
  'error': () => {
    const s = envelope(sine(180, 0.2), 0.001, 0.03, 0.3, 0.15)
    const s2 = envelope(sine(140, 0.2), 0.001, 0.03, 0.2, 0.15)
    return gain(mix(s, s2), 0.6)
  },

  // §56.10 Navigation tap - extremely subtle tick
  'tap': () => {
    const sr = 44100
    const dur = 0.03
    const len = Math.floor(sr * dur)
    const out = new Float32Array(len)
    for (let i = 0; i < len; i++) {
      const t = i / sr
      out[i] = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 100)
    }
    return gain(out, 0.25)
  },

  // §56.11 Celebration - brief cheer sfx layered with chime
  'celebration': () => {
    // Chime layer
    const chime = mix(
      envelope(sine(1047, 0.4), 0.001, 0.05, 0.3, 0.3),
      envelope(sine(1319, 0.35), 0.001, 0.04, 0.25, 0.25),
      envelope(sine(1568, 0.3), 0.001, 0.03, 0.2, 0.2),
    )
    // "Cheer" noise burst layer
    const sr = 44100
    const dur = 0.5
    const len = Math.floor(sr * dur)
    const noise = new Float32Array(len)
    for (let i = 0; i < len; i++) {
      const t = i / sr
      noise[i] = (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 4)
    }
    return gain(mix(chime, noise), 0.6)
  },

  // General success (reuse check-in variant with slight tweak)
  'success': () => {
    const s = mix(
      envelope(sine(784, 0.2), 0.001, 0.03, 0.4, 0.15),
      envelope(sine(1047, 0.25), 0.001, 0.04, 0.3, 0.18),
    )
    return gain(s, 0.6)
  },
}

// --- Generate all files ---

let totalSize = 0
for (const [name, gen] of Object.entries(sounds)) {
  const samples = gen()
  const wav = encodeWav(samples)
  const wavPath = join(OUT_DIR, `${name}.wav`)
  writeFileSync(wavPath, wav)
  const kb = (wav.length / 1024).toFixed(1)
  totalSize += wav.length
  console.log(`  ${name}.wav  ${kb} KB`)
}

console.log(`\nTotal: ${(totalSize / 1024).toFixed(1)} KB across ${Object.keys(sounds).length} files`)
console.log('\nDone! Sound files written to src/assets/sounds/')
console.log('Note: These are synthesised placeholders. Replace with professionally designed sounds.')
