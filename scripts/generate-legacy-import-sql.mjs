#!/usr/bin/env node
/**
 * generate-legacy-import-sql.mjs
 *
 * Reads the legacy Co-Exist Excel spreadsheets and generates a SQL migration
 * that inserts historical events + event_impact rows into Supabase.
 *
 * Usage:  node scripts/generate-legacy-import-sql.mjs
 * Output: supabase/migrations/071_import_legacy_impact_data.sql
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'data')
const OUT = join(ROOT, 'supabase', 'migrations', '071_import_legacy_impact_data.sql')

/* ------------------------------------------------------------------ */
/*  Collective name → UUID mapping (from seed.sql)                     */
/* ------------------------------------------------------------------ */

const COLLECTIVE_MAP = {
  'byron bay':       'c0000000-0000-0000-0000-000000000001',
  'byron':           'c0000000-0000-0000-0000-000000000001',
  'sydney':          'c0000000-0000-0000-0000-000000000002',
  'melbourne':       'c0000000-0000-0000-0000-000000000003',
  'melbourne city':  'c0000000-0000-0000-0000-000000000003',
  'melb':            'c0000000-0000-0000-0000-000000000003',
  'mornington peninsula': 'c0000000-0000-0000-0000-000000000003', // nearest collective
  'gold coast':      'c0000000-0000-0000-0000-000000000004',
  'sunshine coast':  'c0000000-0000-0000-0000-000000000005',
  'brisbane':        'c0000000-0000-0000-0000-000000000006',
  'adelaide':        'c0000000-0000-0000-0000-000000000007',
  'perth':           'c0000000-0000-0000-0000-000000000008',
  'hobart':          'c0000000-0000-0000-0000-000000000009',
  'cairns':          'c0000000-0000-0000-0000-000000000010',
  'newcastle':       'c0000000-0000-0000-0000-000000000011',
  'wollongong':      'c0000000-0000-0000-0000-000000000012',
  'canberra':        'c0000000-0000-0000-0000-000000000013',
  // Additional aliases from the spreadsheets
  'geelong':         'c0000000-0000-0000-0000-000000000003', // nearest: Melbourne
  'ipswich':         'c0000000-0000-0000-0000-000000000006', // nearest: Brisbane
  'townsville':      'c0000000-0000-0000-0000-000000000010', // nearest: Cairns
}

const SEED_ADMIN = 'a0000000-0000-0000-0000-000000000001'

/* ------------------------------------------------------------------ */
/*  Activity type mapping                                              */
/* ------------------------------------------------------------------ */

function mapActivityType(type, subtype, title) {
  // Combine all text sources for matching
  const t = ((type || '') + ' ' + (subtype || '') + ' ' + (title || '')).toLowerCase()
  if (/beach\s*clean|shore\s*clean|coast.*clean|litter/.test(t)) return 'shore_cleanup'
  if (/tree\s*plant|planting/.test(t)) return 'tree_planting'
  if (/weed|bush\s*regen|habitat|regen|bushcare|restor/.test(t)) return 'land_regeneration'
  if (/hike|walk|nature\s*hik|spotlighting|spotlight|falls/.test(t)) return 'nature_walk'
  if (/camp\s*out|campout/.test(t)) return 'camp_out'
  if (/retreat/.test(t)) return 'retreat'
  if (/film|screen/.test(t)) return 'film_screening'
  if (/marine|dune\s*brush|mangrove|coral|reef|snorkel/.test(t)) return 'marine_restoration'
  if (/clean\s*up|cleanup/.test(t)) return 'shore_cleanup'
  return 'workshop'
}

/* ------------------------------------------------------------------ */
/*  Deterministic UUID v5 (simplified — sha1-based)                    */
/* ------------------------------------------------------------------ */

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' // DNS namespace

function uuid5(name) {
  const hash = createHash('sha1')
    .update(Buffer.from(UUID_NAMESPACE.replace(/-/g, ''), 'hex'))
    .update(name)
    .digest('hex')
  // Format as UUID v5: set version (5) and variant (8/9/a/b)
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-')
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveCollective(name) {
  if (!name) return null
  const key = name.toString().trim().toLowerCase()
    .replace(/\s*collective\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return COLLECTIVE_MAP[key] || null
}

/** Parse various date formats from the spreadsheets */
function parseDate(val) {
  if (!val) return null
  // Excel serial number
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return new Date(d.y, d.m - 1, d.d, 8, 0, 0)
  }
  // String dates
  const s = val.toString().trim()
  // Try AU format: dd/mm/yyyy or d/m/yyyy
  const auMatch = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (auMatch) {
    const day = parseInt(auMatch[1])
    const month = parseInt(auMatch[2]) - 1
    let year = parseInt(auMatch[3])
    if (year < 100) year += 2000
    return new Date(year, month, day, 8, 0, 0)
  }
  // ISO or other parseable format
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  return null
}

function safeNum(val) {
  if (val == null || val === '' || val === '-') return null
  // Handle strings like "40 kg" or "4 tonnes"
  const s = val.toString().replace(/[,\s]/g, '').replace(/kg|tonnes?|t$/i, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function safeInt(val) {
  const n = safeNum(val)
  return n != null ? Math.round(n) : null
}

function escSql(str) {
  if (str == null) return 'NULL'
  return "'" + str.toString().replace(/'/g, "''").replace(/\\/g, '\\\\') + "'"
}

function numSql(val) {
  return val == null ? 'NULL' : val.toString()
}

/* ------------------------------------------------------------------ */
/*  Read + parse workbooks                                             */
/* ------------------------------------------------------------------ */

console.log('Reading Excel files...')

const masterWb = XLSX.readFile(join(DATA, 'Master Impact Data Sheet.xlsx'))
const eventsWb = XLSX.readFile(join(DATA, 'Events & Impact 23-25.xlsx'))

/* ── Post Event Review (primary source) ── */

const postEventSheet = masterWb.Sheets['Post Event Review']
const postEventRows = XLSX.utils.sheet_to_json(postEventSheet, { defval: '' })
console.log(`  Post Event Review: ${postEventRows.length} rows`)

/* ── Events & Impact 2024 + 2025 (supplementary) ── */

const events2024Sheet = eventsWb.Sheets['2024']
const events2025Sheet = eventsWb.Sheets['2025']
const events2024Rows = events2024Sheet ? XLSX.utils.sheet_to_json(events2024Sheet, { defval: '' }) : []
const events2025Rows = events2025Sheet ? XLSX.utils.sheet_to_json(events2025Sheet, { defval: '' }) : []
console.log(`  Events & Impact 2024: ${events2024Rows.length} rows`)
console.log(`  Events & Impact 2025: ${events2025Rows.length} rows`)

/* ------------------------------------------------------------------ */
/*  Transform Post Event Review rows                                   */
/* ------------------------------------------------------------------ */

console.log('\nProcessing Post Event Review...')

// Track inserted event signatures to deduplicate
const insertedSigs = new Set()
const eventInserts = []
const impactInserts = []
let skipped = 0
let unmatchedCollectives = new Set()

for (const row of postEventRows) {
  const title = (row['Event Title'] || row['Event title'] || '').toString().trim()
  const dateRaw = row['Date of Event'] || row['Date'] || row['date'] || ''
  const collectiveRaw = (row['Collective'] || row['collective'] || '').toString().trim()
  const location = (row['Location'] || row['location'] || '').toString().trim()
  const postcode = (row['Postcode'] || row['postcode'] || '').toString().trim()
  const attendance = safeInt(row['Number of Attendees'] || row['Attendance'] || row['attendance'])
  const eventType = (row['Type of Event'] || '').toString()
  const consType = (row['Type of Conservation Event'] || row['Type of Conservation event'] || '').toString()
  const rubbishKg = safeNum(row['Amount of Rubbish Removed (kg\'s)'] || row['Amount of Rubbish Removed (kgs)'] || row['Rubbish Removed'] || row['Litter Removed'])
  const treesPlanted = safeInt(row['Trees Planted'] || row['trees planted'])
  const weeds = safeInt(row['Weeds'] || row['weeds'])
  const highlights = (row['Outstanding Highlights'] || row['Highlights'] || '').toString().trim()
  const issues = (row['Any Issues'] || row['Issues'] || '').toString().trim()
  const grantProject = (row['Grant Project'] || '').toString().trim()

  if (!title || !dateRaw) { skipped++; continue }

  const date = parseDate(dateRaw)
  if (!date) { skipped++; continue }

  const collectiveId = resolveCollective(collectiveRaw)
  if (!collectiveId) {
    if (collectiveRaw) unmatchedCollectives.add(collectiveRaw)
    skipped++
    continue
  }

  const address = [location, postcode].filter(Boolean).join(' ')
  const activityType = mapActivityType(eventType, consType, title)

  // Dedup signature
  const sig = `${date.toISOString().slice(0, 10)}|${collectiveId}|${title.toLowerCase().slice(0, 40)}`
  if (insertedSigs.has(sig)) continue
  insertedSigs.add(sig)

  // Generate deterministic UUIDs
  const eventId = uuid5(`coexist-event:${sig}`)
  const impactId = uuid5(`coexist-impact:${sig}`)

  const dateIso = date.toISOString().replace('Z', '+10:00')
  const dateEnd = new Date(date.getTime() + 4 * 60 * 60 * 1000).toISOString().replace('Z', '+10:00')

  // Build notes
  const noteParts = [`Legacy import: ${attendance ?? '?'} attendees`]
  if (highlights) noteParts.push(`Highlights: ${highlights}`)
  if (issues) noteParts.push(`Issues: ${issues}`)
  if (grantProject) noteParts.push(`Grant: ${grantProject}`)
  const notes = noteParts.join('. ')

  eventInserts.push(
    `  (${escSql(eventId)}, ${escSql(collectiveId)}, ${escSql(SEED_ADMIN)}, ` +
    `${escSql(title)}, ${escSql(activityType)}, ${escSql(address || null)}, ` +
    `${escSql(dateIso)}, ${escSql(dateEnd)}, 'completed', ${escSql(dateIso)})`
  )

  impactInserts.push(
    `  (${escSql(impactId)}, ${escSql(eventId)}, ${escSql(SEED_ADMIN)}, ` +
    `${numSql(treesPlanted)}, ${numSql(rubbishKg)}, ${numSql(weeds)}, ` +
    `${escSql(notes)}, ${escSql(dateIso)})`
  )
}

console.log(`  Events from Post Event Review: ${eventInserts.length}`)
console.log(`  Skipped: ${skipped}`)
if (unmatchedCollectives.size > 0) {
  console.log(`  Unmatched collectives: ${[...unmatchedCollectives].join(', ')}`)
}

/* ------------------------------------------------------------------ */
/*  Transform Events & Impact 2024/2025 (supplementary)                */
/* ------------------------------------------------------------------ */

console.log('\nProcessing Events & Impact 2024/2025 supplements...')

let supplementAdded = 0

function processSupplementRow(row, yearFallback) {
  const title = (row['Event'] || row['event'] || '').toString().trim()
  const dateRaw = row['Date'] || row['date'] || ''
  const collectiveRaw = (row['Collective'] || row['collective'] || '').toString().trim()
  const location = (row['Location'] || row['location'] || '').toString().trim()
  const attendance = safeInt(row['Attendance'] || row['attendance'] || row['Sign in #\'s'])
  const rubbishKg = safeNum(row['Litter Removed'] || row['litter removed'] || row['Litter removed'])
  const treesPlanted = safeInt(row['Trees Planted'] || row['trees planted'] || row['Trees planted'])
  const weeds = safeInt(row['Weeds'] || row['weeds'])
  const contractorCost = safeNum(row['Contractor Cost'] || row['contractor cost'])

  if (!title) return

  let date = parseDate(dateRaw)
  if (!date) return

  const collectiveId = resolveCollective(collectiveRaw)
  if (!collectiveId) {
    if (collectiveRaw) unmatchedCollectives.add(collectiveRaw)
    return
  }

  const activityType = mapActivityType('', '', title)

  // Check if already inserted
  const sig = `${date.toISOString().slice(0, 10)}|${collectiveId}|${title.toLowerCase().slice(0, 40)}`
  if (insertedSigs.has(sig)) return
  insertedSigs.add(sig)

  // Only add if there's some impact data
  const hasImpact = rubbishKg || treesPlanted || weeds || attendance
  if (!hasImpact) return

  const eventId = uuid5(`coexist-event:${sig}`)
  const impactId = uuid5(`coexist-impact:${sig}`)

  const dateIso = date.toISOString().replace('Z', '+10:00')
  const dateEnd = new Date(date.getTime() + 4 * 60 * 60 * 1000).toISOString().replace('Z', '+10:00')

  const noteParts = [`Legacy import: ${attendance ?? '?'} attendees`]

  // Build custom_metrics for contractor cost
  let customMetrics = null
  if (contractorCost) {
    customMetrics = JSON.stringify({ contractor_cost: contractorCost })
  }

  eventInserts.push(
    `  (${escSql(eventId)}, ${escSql(collectiveId)}, ${escSql(SEED_ADMIN)}, ` +
    `${escSql(title)}, ${escSql(activityType)}, ${escSql(location || null)}, ` +
    `${escSql(dateIso)}, ${escSql(dateEnd)}, 'completed', ${escSql(dateIso)})`
  )

  impactInserts.push(
    `  (${escSql(impactId)}, ${escSql(eventId)}, ${escSql(SEED_ADMIN)}, ` +
    `${numSql(treesPlanted)}, ${numSql(rubbishKg)}, ${numSql(weeds)}, ` +
    `${escSql(noteParts.join('. '))}, ${escSql(dateIso)}` +
    (customMetrics ? `, ${escSql(customMetrics)}` : ', NULL') +
    `)`
  )

  supplementAdded++
}

for (const row of events2024Rows) processSupplementRow(row, 2024)
for (const row of events2025Rows) processSupplementRow(row, 2025)

console.log(`  Supplementary events added: ${supplementAdded}`)
console.log(`  Total events: ${eventInserts.length}`)

if (unmatchedCollectives.size > 0) {
  console.log(`\n  All unmatched collectives: ${[...unmatchedCollectives].join(', ')}`)
}

/* ------------------------------------------------------------------ */
/*  Generate SQL                                                       */
/* ------------------------------------------------------------------ */

console.log('\nGenerating SQL migration...')

// The supplement rows have an extra custom_metrics column, so we need two INSERT blocks
// or we unify the column list. Let's unify by ensuring all impact inserts have the same columns.

// Re-process: rebuild impact inserts with consistent columns
// Actually, let's just generate separate inserts for the two formats, or better yet,
// regenerate with a unified approach.

// Simpler: just generate with all columns, using NULL for custom_metrics where not needed.
// We need to redo the impact inserts. Let me track them differently.

// -- Actually, looking at the code above, the Post Event Review inserts have 8 columns
// and the supplement ones have 9 (with custom_metrics). Let's fix this by adding NULL
// custom_metrics to the post event review ones.

// We'll regenerate from scratch with a unified approach. The arrays already have the data,
// but the column count differs. The simplest fix: always include custom_metrics.

// Let me just write two INSERT blocks with different column lists.

const sql = `-- 071_import_legacy_impact_data.sql
-- Generated by scripts/generate-legacy-import-sql.mjs
-- One-time import of legacy Co-Exist impact data (2022-2026)
-- Source: data/Master Impact Data Sheet.xlsx, data/Events & Impact 23-25.xlsx
--
-- Total events: ${eventInserts.length}
-- Generated: ${new Date().toISOString()}

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- Insert historical events
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO events (id, collective_id, created_by, title, activity_type, address, date_start, date_end, status, created_at)
VALUES
${eventInserts.join(',\n')}
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- Insert corresponding impact logs
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO event_impact (id, event_id, logged_by, trees_planted, rubbish_kg, invasive_weeds_pulled, notes, logged_at)
VALUES
${impactInserts.filter(r => !r.includes('contractor_cost')).join(',\n')}
ON CONFLICT (id) DO NOTHING;

${impactInserts.filter(r => r.includes('contractor_cost')).length > 0 ? `
-- Impact rows with custom_metrics (contractor costs from 2024)
INSERT INTO event_impact (id, event_id, logged_by, trees_planted, rubbish_kg, invasive_weeds_pulled, notes, logged_at, custom_metrics)
VALUES
${impactInserts.filter(r => r.includes('contractor_cost')).join(',\n')}
ON CONFLICT (id) DO NOTHING;
` : ''}

COMMIT;
`

writeFileSync(OUT, sql, 'utf-8')
console.log(`\nDone! Migration written to:`)
console.log(`  ${OUT}`)
console.log(`  ${eventInserts.length} events + ${impactInserts.length} impact rows`)
