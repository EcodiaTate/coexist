#!/usr/bin/env node
/* De-cartoonify the Co-Exist admin surface (Tate 2026-06-23: sharp/editorial).
   Deterministic sweep only — radius sharpen, heavy/colored-glow shadow strip,
   bouncy active:scale calm. Decorative gradients + amber are handled per-file
   afterwards (they need judgement on the solid-fill target). Scope is admin-only
   so the member-facing shared Card/Button are untouched. */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ROOT = '/Users/ecodia/.code/coexist'
const files = execSync(
  `find ${ROOT}/src/pages/admin ${ROOT}/src/components/admin -name '*.tsx'; ` +
  `echo ${ROOT}/src/components/admin-hero-stat.tsx; ` +
  `echo ${ROOT}/src/components/admin-layout.tsx`,
).toString().trim().split('\n').filter(Boolean)

const SIDE = '(?:-(?:t|b|l|r|tl|tr|bl|br|s|e|ss|se|es|ee))?'
const COLORS = 'primary|secondary|accent|moss|sprout|sky|info|plum|bark|coral|amber|success|warning|error|neutral|brand|black|white'

const rules = [
  // --- Radius: collapse to a 2-step editorial scale (cards md, tiles sm) ---
  // directional + plain, longest first
  [new RegExp(`rounded(${SIDE})-(?:3xl|2xl)\\b`, 'g'), 'rounded$1-md'],
  [new RegExp(`rounded(${SIDE})-(?:xl|lg)\\b`, 'g'), 'rounded$1-sm'],
  // --- Heavy shadows -> restrained shadow-sm (marketing site is shadow-sm) ---
  [/shadow-(?:2xl|xl|lg)\b/g, 'shadow-sm'],
  // --- Colored glow shadows: drop the tinted token entirely ---
  [new RegExp(`\\s*shadow-(?:${COLORS})-[0-9]{2,3}/[0-9]{1,3}\\b`, 'g'), ''],
  [new RegExp(`\\s*shadow-(?:${COLORS})/[0-9]{1,3}\\b`, 'g'), ''],
  [new RegExp(`\\s*shadow-(?:${COLORS})-[0-9]{2,3}\\b`, 'g'), ''],
  // --- Calm the cartoonish tap bounce ---
  [/active:scale-\[0\.9[0-6]\]/g, 'active:scale-[0.98]'],
]

let changed = 0
const report = []
for (const f of files) {
  let src = readFileSync(f, 'utf8')
  const before = src
  for (const [re, rep] of rules) src = src.replace(re, rep)
  // NOTE: deliberately do NOT touch whitespace globally — a stray double space
  // inside a className is harmless, and collapsing file-wide destroys indentation.
  if (src !== before) {
    writeFileSync(f, src)
    changed++
    report.push(f.replace(ROOT + '/', ''))
  }
}
console.log(`files scanned: ${files.length}, changed: ${changed}`)
report.forEach((r) => console.log('  ~ ' + r))
