#!/usr/bin/env node
/* Pass 2: extend the de-cartoonify sweep to the REST of the Co-Exist app
   (member / leader / auth / public surfaces + shared primitives). Same rules as
   the admin codemod: sharpen radius to the md/sm editorial scale, calm heavy +
   colored-glow shadows, soften the tap bounce. Scope = every src tsx EXCEPT the
   admin files already done in pass 1. Decorative gradients + amber are handled
   in a second pass (they need per-fragment solid-fill judgement). No global
   whitespace touching (that trap flattened indentation in pass 1). */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ROOT = '/Users/ecodia/.code/coexist'
const files = execSync(
  `find ${ROOT}/src -name '*.tsx' ` +
  `-not -path '*/admin/*' -not -name 'admin-*.tsx'`,
).toString().trim().split('\n').filter(Boolean)

const SIDE = '(?:-(?:t|b|l|r|tl|tr|bl|br|s|e|ss|se|es|ee))?'
const COLORS = 'primary|secondary|accent|olive|moss|sprout|sky|info|plum|bark|coral|amber|success|warning|error|neutral|brand|black|white'

const rules = [
  [new RegExp(`rounded(${SIDE})-(?:3xl|2xl)\\b`, 'g'), 'rounded$1-md'],
  [new RegExp(`rounded(${SIDE})-(?:xl|lg)\\b`, 'g'), 'rounded$1-sm'],
  [/shadow-(?:2xl|xl|lg)\b/g, 'shadow-sm'],
  [new RegExp(`\\s*shadow-(?:${COLORS})-[0-9]{2,3}/[0-9]{1,3}\\b`, 'g'), ''],
  [new RegExp(`\\s*shadow-(?:${COLORS})/[0-9]{1,3}\\b`, 'g'), ''],
  [new RegExp(`\\s*shadow-(?:${COLORS})-[0-9]{2,3}\\b`, 'g'), ''],
  [/active:scale-\[0\.9[0-6]\]/g, 'active:scale-[0.98]'],
]

let changed = 0
for (const f of files) {
  let src = readFileSync(f, 'utf8')
  const before = src
  for (const [re, rep] of rules) src = src.replace(re, rep)
  if (src !== before) { writeFileSync(f, src); changed++ }
}
console.log(`scanned ${files.length}, changed ${changed}`)
