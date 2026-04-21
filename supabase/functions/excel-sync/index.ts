/**
 * excel-sync - Supabase Edge Function
 *
 * Sync between Co-Exist Supabase database and the
 * "Master Impact Data Sheet.xlsx" on SharePoint (OneDrive for Business).
 *
 * CRITICAL RULES:
 * - Default direction is `from-excel`. Calling without `?direction=...` does the safe read
 *   direction and never writes to the sheet.
 * - Pre-2026 data in Excel is UNTOUCHABLE. Never written to by the app.
 * - to-excel writes app-created completed events that pass the migration gate:
 *     (a) events whose title starts with "test" (dev/test, always sync regardless of
 *         collective state), OR
 *     (b) events whose collective has forms_migrated_at set AND whose date_start is
 *         on or after forms_migrated_at (collective has cut over from Forms to the app).
 *   Collectives with NULL forms_migrated_at are still using Forms for real events — their
 *   app events are NOT pushed to the sheet, preventing double-entries during transition.
 * - DEDUP: before appending any app-generated row, the function builds a signature set
 *   from all integer-ID (Forms-origin) rows already on the sheet. Signature format is
 *   (collective | date_iso | title), lowercased and trimmed. If an app event's signature
 *   matches a Forms row, the app event is SKIPPED (not appended) and logged in errors as
 *   `skippedDuplicates`. Admin must reconcile the Forms row manually — no auto-overwrite.
 * - from-excel is the PRIORITY direction. Run it first in full sync.
 *
 * Directions:
 *   POST /excel-sync?direction=to-excel      -> append/update migration-gated events in Excel
 *   POST /excel-sync?direction=from-excel    -> pull Excel data into Supabase (Excel wins)
 *   POST /excel-sync?direction=full          -> from-excel first, then to-excel
 *   POST /excel-sync?event_id=xxx            -> sync single event to Excel
 *
 * Column mapping (28 columns, A-AB on "Post Event Review" sheet):
 *   0:  ID                    <- event.id (or legacy ID from sheet)
 *   1:  Event Title           <- events.title
 *   2:  Date of Event         <- events.date_start (Excel serial number)
 *   3:  Collective            <- collectives.name
 *   4:  Location              <- events.address
 *   5:  Postcode              <- extracted from address
 *   6:  Primary Organiser     <- constant "Co-Exist" (matches Forms convention; partner-org
 *                                support will come via event_organisations table — see TODO)
 *   7:  Other Group Attended  <- survey answer q1
 *   8:  Which Landcare Group  <- survey answer q2
 *   9:  Which OzFish group    <- survey answer q3
 *   10: Co-Exist Leader       <- profiles.display_name (impact.logged_by or event creator)
 *   11: Number of Attendees   <- event_impact.attendees
 *   12: Type of Event         <- "Conservation" or "Recreation" based on activity_type
 *   13: Type of Conservation  <- activity label if conservation type
 *   14: Recreational type     <- activity label if recreational type
 *   15: Rubbish Removed (kg)  <- survey q4 or event_impact.rubbish_kg
 *   16: Trees Planted         <- survey q5 or event_impact.trees_planted
 *   17: Collect/Make Anything <- survey q6
 *   18: What & How Much       <- survey q7
 *   19: Hike/track name       <- survey q8
 *   20: Any Issues            <- survey q9
 *   21: Use First Aid Kit     <- survey q10
 *   22: Outstanding Highlights<- survey q11
 *   23: Images to OneDrive    <- survey q12
 *   24: Videos to Google      <- survey q13
 *   25: Grant Project         <- survey q14
 *   26: Year-Month            <- derived from date_start
 *   27: Posted Wrap-up Insta  <- survey q15
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---- Config ----
const GRAPH_TENANT_ID = Deno.env.get('GRAPH_TENANT_ID') ?? ''
const GRAPH_CLIENT_ID = Deno.env.get('GRAPH_CLIENT_ID') ?? ''
const GRAPH_CLIENT_SECRET = Deno.env.get('GRAPH_CLIENT_SECRET') ?? ''
const DRIVE_ID = 'b!jB_eUPJMbUWf3eip_Me-34G0StMYwYdHtdf4sTNow-uVV9nof_IvQprzswNpaD8y'
const ITEM_ID = '01RJHFBL37QUUGOQUVL5DJ67A53VKNDAGE'
const SHEET_NAME = 'Post Event Review'

// Only sync events from 2026 onwards - historical data is Excel-only
const SYNC_CUTOFF_DATE = '2026-01-01'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Activity types that are "Conservation" vs "Recreation"
const CONSERVATION_TYPES = ['clean_up', 'tree_planting', 'ecosystem_restoration']
const RECREATION_TYPES = ['nature_hike', 'camp_out', 'spotlighting']
const ACTIVITY_LABELS: Record<string, string> = {
  clean_up: 'Clean Up',
  tree_planting: 'Tree Planting',
  ecosystem_restoration: 'Ecosystem Restoration',
  nature_hike: 'Nature Hike',
  camp_out: 'Camp Out',
  spotlighting: 'Spotlighting',
  other: 'Other',
}

// ---- Microsoft Graph helpers ----

async function getGraphToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${GRAPH_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GRAPH_CLIENT_ID,
        scope: 'https://graph.microsoft.com/.default',
        client_secret: GRAPH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    },
  )
  const data = await res.json()
  if (!data.access_token) throw new Error(`Graph auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

async function graphRequest(token: string, path: string, method = 'GET', body?: unknown) {
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/worksheets/${encodeURIComponent(SHEET_NAME)}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Graph API ${method} ${path} failed (${res.status}): ${errText}`)
  }
  return res.json()
}

// ---- Date helpers ----

/** Convert ISO date to Excel serial number */
function dateToExcelSerial(isoDate: string): number {
  const date = new Date(isoDate)
  const excelEpoch = new Date(1899, 11, 30)
  const diffMs = date.getTime() - excelEpoch.getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

/** Convert Excel serial number to ISO date string (YYYY-MM-DD) */
function excelSerialToDate(serial: number): string {
  const excelEpoch = new Date(1899, 11, 30)
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000)
  return date.toISOString().split('T')[0]
}

/** Format date as YYYY-MM for Year-Month column */
function toYearMonth(isoDate: string): string {
  const d = new Date(isoDate)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Extract postcode (last 4-digit number) from address string */
function extractPostcode(address: string): string {
  const match = address?.match(/\b(\d{4})\b/g)
  return match ? match[match.length - 1] : ''
}

/** Convert yes_no survey answer to Yes/No string */
function yesNo(val: unknown): string {
  if (val === true || val === 'yes' || val === 'Yes') return 'Yes'
  if (val === false || val === 'no' || val === 'No') return 'No'
  return ''
}

// ---- Read existing Excel data ----

interface ExcelState {
  rows: unknown[][]
  existingIds: Set<string>
  rowCount: number
}

async function readExcelState(graphToken: string): Promise<ExcelState> {
  const usedRange = await graphRequest(graphToken, '/usedRange')
  const rows = usedRange.values ?? []
  const existingIds = new Set<string>()
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) existingIds.add(String(rows[i][0]))
  }
  return { rows, existingIds, rowCount: rows.length }
}

// ---- Build Excel row from Supabase data ----

interface EventData {
  id: string
  title: string
  date_start: string
  activity_type: string
  address: string
  collective_name: string
  creator_name: string
  leader_name: string
  attendees: number | null
  checked_in_count: number
  rubbish_kg: number | null
  trees_planted: number | null
  answers: Record<string, unknown>
}

function buildExcelRow(e: EventData): (string | number | null)[] {
  const isConservation = CONSERVATION_TYPES.includes(e.activity_type)
  const isRecreation = RECREATION_TYPES.includes(e.activity_type)
  const label = ACTIVITY_LABELS[e.activity_type] ?? e.activity_type

  return [
    e.id,                                                    // 0: ID
    e.title,                                                 // 1: Event Title
    dateToExcelSerial(e.date_start),                         // 2: Date of Event
    e.collective_name,                                       // 3: Collective
    e.address ?? '',                                         // 4: Location
    (e.answers?.postcode as string) ?? extractPostcode(e.address ?? ''), // 5: Postcode (survey answer, fallback to address extraction)
    // TODO: When partner-org events land, populate `event_organisations` + `organisations` tables
    // and pull the first related organisation's name here. For now, all app events are Co-Exist.
    // Matches the Forms convention of writing "Co-Exist" in this column for every row.
    'Co-Exist',                                              // 6: Primary Organiser of the Event
    (e.answers?.q1 as string) ?? '',                         // 7: Other Group Attended
    (e.answers?.q2 as string) ?? '',                         // 8: Which Landcare Group
    (e.answers?.q3 as string) ?? '',                         // 9: Which OzFish group
    (e.answers?.leader_name as string) ?? e.leader_name ?? '', // 10: Co-Exist Leader (from survey dropdown)
    e.attendees ?? e.checked_in_count ?? '',                  // 11: Number of Attendees (impact override or check-in count)
    isConservation ? 'Conservation' : isRecreation ? 'Recreation' : label, // 12: Type of Event
    isConservation ? label : '',                             // 13: Conservation type
    isRecreation ? label : '',                               // 14: Recreational type
    e.answers?.q4 ?? e.rubbish_kg ?? '',                     // 15: Rubbish Removed
    e.answers?.q5 ?? e.trees_planted ?? '',                  // 16: Trees Planted
    yesNo(e.answers?.q6),                                    // 17: Collect/Make Anything
    (e.answers?.q7 as string) ?? '',                         // 18: What & How Much
    (e.answers?.q8 as string) ?? '',                         // 19: Hike/track name
    (e.answers?.q9 as string) ?? '',                         // 20: Any Issues
    yesNo(e.answers?.q10),                                   // 21: Use First Aid Kit
    (e.answers?.q11 as string) ?? '',                        // 22: Outstanding Highlights
    yesNo(e.answers?.q12),                                   // 23: Images to OneDrive
    yesNo(e.answers?.q13),                                   // 24: Videos to Google
    (e.answers?.q14 as string) ?? '',                        // 25: Grant Project
    toYearMonth(e.date_start),                               // 26: Year-Month
    yesNo(e.answers?.q15),                                   // 27: Posted Wrap-up Insta
  ]
}

// ---- Fetch event data from Supabase ----

async function fetchEventData(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
): Promise<EventData | null> {
  const { data: event } = await supabase
    .from('events')
    .select('id, title, date_start, activity_type, address, collective_id, created_by')
    .eq('id', eventId)
    .single()

  if (!event) return null

  // Enforce 2026+ cutoff
  if (event.date_start < SYNC_CUTOFF_DATE) return null

  const { data: collective } = await supabase
    .from('collectives')
    .select('name')
    .eq('id', event.collective_id)
    .single()

  const { data: creator } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', event.created_by)
    .single()

  const { data: impact } = await supabase
    .from('event_impact')
    .select('attendees, rubbish_kg, trees_planted, logged_by')
    .eq('event_id', eventId)
    .single()

  // Get actual check-in count for attendees
  const { count: checkedInCount } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('checked_in', true)

  let leaderName = creator?.display_name ?? ''
  if (impact?.logged_by && impact.logged_by !== event.created_by) {
    const { data: leader } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', impact.logged_by)
      .single()
    if (leader) leaderName = leader.display_name
  }

  const { data: surveys } = await supabase
    .from('surveys')
    .select('id')
    .eq('activity_type', event.activity_type)
    .eq('is_impact_form', true)
    .eq('status', 'active')

  let answers: Record<string, unknown> = {}
  if (surveys && surveys.length > 0) {
    const surveyIds = surveys.map((s: { id: string }) => s.id)
    const { data: responses } = await supabase
      .from('survey_responses')
      .select('answers')
      .eq('event_id', eventId)
      .in('survey_id', surveyIds)
      .order('submitted_at', { ascending: false })
      .limit(1)

    if (responses && responses.length > 0) {
      answers = (responses[0].answers as Record<string, unknown>) ?? {}
    }
  }

  return {
    id: event.id,
    title: event.title,
    date_start: event.date_start,
    activity_type: event.activity_type,
    address: event.address ?? '',
    collective_name: collective?.name ?? '',
    creator_name: creator?.display_name ?? '',
    leader_name: leaderName,
    attendees: impact?.attendees ?? null,
    checked_in_count: checkedInCount ?? 0,
    rubbish_kg: impact?.rubbish_kg ?? null,
    trees_planted: impact?.trees_planted ?? null,
    answers,
  }
}

// ---- Dedup helper ----

/** Canonical signature for matching Forms rows against app events.
 *  Format: collective|date_iso_yyyy_mm_dd|title (all lowercased and trimmed). */
function sigOf(collective: string, dateIso: string, title: string): string {
  return [
    (collective ?? '').trim().toLowerCase(),
    dateIso.slice(0, 10),
    (title ?? '').trim().toLowerCase(),
  ].join('|')
}

// ---- Sync: Supabase -> Excel (migration-gated, append new + update existing) ----

async function syncToExcel(
  supabase: ReturnType<typeof createClient>,
  graphToken: string,
  eventId?: string,
): Promise<{
  appended: number
  updated: number
  skipped: number
  skippedDuplicates: number
  errors: string[]
}> {
  const errors: string[] = []
  let appended = 0
  let updated = 0
  let skipped = 0
  let skippedDuplicates = 0

  // Read existing Excel data
  let excelState: ExcelState
  try {
    excelState = await readExcelState(graphToken)
  } catch (err) {
    errors.push(`Failed to read Excel: ${(err as Error).message}`)
    return { appended, updated, skipped, skippedDuplicates, errors }
  }

  // Build a map of existing event IDs to their row index (1-based)
  const idToRowIndex = new Map<string, number>()
  for (let i = 1; i < excelState.rows.length; i++) {
    const id = String(excelState.rows[i][0] ?? '')
    if (id) idToRowIndex.set(id, i + 1) // +1 because Excel rows are 1-based
  }

  // Build a signature set from Forms rows (integer IDs only) for dedup protection.
  // If an app event's signature matches a Forms row, it is skipped — not appended.
  // This prevents double-entries during the transition from Forms to the app for any
  // collective that had real events logged via both systems on the same date.
  const formsSignatures = new Set<string>()
  for (let i = 1; i < excelState.rows.length; i++) {
    const row = excelState.rows[i]
    const id = String(row[0] ?? '')
    if (!id) continue
    // Only integer IDs are Forms rows — UUIDs are app rows and don't belong in the dedup set
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)) continue

    const title = String(row[1] ?? '')
    const dateSerial = Number(row[2])
    const dateIso = Number.isFinite(dateSerial) ? excelSerialToDate(dateSerial) : ''
    const collective = String(row[3] ?? '')
    if (!title || !dateIso) continue
    formsSignatures.add(sigOf(collective, dateIso, title))
  }

  // Determine which events to sync
  let eventIds: string[] = []
  if (eventId) {
    eventIds = [eventId]
  } else {
    // Batch mode: completed 2026+ events that pass the migration gate.
    // Pull collective forms_migrated_at and filter in JS:
    //   (a) test-prefixed titles always sync (dev/test events, regardless of collective state)
    //   (b) non-test events only sync if their collective has forms_migrated_at set AND
    //       date_start >= forms_migrated_at (the collective has cut over from Forms)
    const { data: events } = await supabase
      .from('events')
      .select('id, title, date_start, collective_id, collectives(forms_migrated_at)')
      .eq('status', 'completed')
      .gte('date_start', SYNC_CUTOFF_DATE)
      .order('date_start', { ascending: true })

    const filtered = ((events ?? []) as any[]).filter((e: any) => {
      if (/^test/i.test(e.title)) return true
      const migratedAt = (e.collectives as any)?.forms_migrated_at
      if (!migratedAt) return false
      return new Date(e.date_start) >= new Date(migratedAt)
    })

    eventIds = filtered.map((e: any) => e.id)
  }

  // Sort into append vs update
  const newRows: (string | number | null)[][] = []
  const updateRows: { rowIndex: number; row: (string | number | null)[] }[] = []

  for (const eid of eventIds) {
    try {
      const data = await fetchEventData(supabase, eid)
      if (!data) {
        skipped++
        continue
      }

      const row = buildExcelRow(data)
      const existingRowIndex = idToRowIndex.get(eid)

      if (existingRowIndex) {
        // App event already in sheet - UPDATE the row
        updateRows.push({ rowIndex: existingRowIndex, row })
        updated++
      } else {
        // New app event - check dedup before appending.
        // If this event matches a Forms row on (collective, date, title), skip it.
        // The Forms row is the authoritative record for that event; appending an app row
        // would create a duplicate. Admin must reconcile the Forms row manually.
        const eventSig = sigOf(data.collective_name, data.date_start, data.title)
        if (formsSignatures.has(eventSig)) {
          skippedDuplicates++
          errors.push(`Event ${eid}: skipped (matches Forms row signature ${eventSig})`)
          continue
        }
        newRows.push(row)
        appended++
      }
    } catch (err) {
      errors.push(`Event ${eid}: ${(err as Error).message}`)
    }
  }

  // Append new rows to the end of the sheet
  if (newRows.length > 0) {
    try {
      const startRow = excelState.rowCount + 1
      const endRow = startRow + newRows.length - 1
      const range = `A${startRow}:AB${endRow}`

      await graphRequest(
        graphToken,
        `/range(address='${range}')`,
        'PATCH',
        { values: newRows },
      )
    } catch (err) {
      errors.push(`Failed to append rows: ${(err as Error).message}`)
      appended = 0
    }
  }

  // Update existing rows
  for (const { rowIndex, row } of updateRows) {
    try {
      await graphRequest(
        graphToken,
        `/range(address='A${rowIndex}:AB${rowIndex}')`,
        'PATCH',
        { values: [row] },
      )
    } catch (err) {
      errors.push(`Failed to update row ${rowIndex}: ${(err as Error).message}`)
    }
  }

  return { appended, updated, skipped, skippedDuplicates, errors }
}

// ---- Sync: Excel -> Supabase (Excel is source of truth) ----

async function syncFromExcel(
  supabase: ReturnType<typeof createClient>,
  graphToken: string,
): Promise<{ synced: number; skippedLegacy: number; errors: string[] }> {
  const errors: string[] = []
  let synced = 0
  let skippedLegacy = 0

  // Read all Excel data
  let rows: unknown[][]
  try {
    const usedRange = await graphRequest(graphToken, '/usedRange')
    rows = usedRange.values ?? []
  } catch (err) {
    return { synced, skippedLegacy, errors: [`Failed to read Excel: ${(err as Error).message}`] }
  }

  if (rows.length < 2) return { synced, skippedLegacy, errors: ['No data rows in Excel'] }

  // Process each data row (skip header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const excelId = String(row[0] ?? '')
    if (!excelId) continue

    try {
      // Check if this ID is a Supabase UUID (app events) or legacy ID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(excelId)

      if (!isUuid) {
        skippedLegacy++
        continue
      }

      // Excel values take priority - update Supabase with what Excel says
      const attendees = row[11] ? Number(row[11]) : null
      const rubbishKg = row[15] ? Number(row[15]) : null
      const treesPlanted = row[16] ? Number(row[16]) : null

      if (attendees !== null || rubbishKg !== null || treesPlanted !== null) {
        const { error } = await supabase
          .from('event_impact')
          .upsert(
            {
              event_id: excelId,
              attendees,
              rubbish_kg: rubbishKg,
              trees_planted: treesPlanted,
            },
            { onConflict: 'event_id' },
          )

        if (error) {
          errors.push(`Row ${i + 1} (${excelId}): impact upsert failed: ${error.message}`)
          continue
        }
      }

      synced++
    } catch (err) {
      errors.push(`Row ${i + 1} (${excelId}): ${(err as Error).message}`)
    }
  }

  return { synced, skippedLegacy, errors }
}

// ---- Delete: Remove event row from Excel (dev/test only, no auto-trigger) ----

async function deleteFromExcel(
  graphToken: string,
  eventId: string,
): Promise<{ deleted: boolean; error?: string }> {
  // Read sheet to find the row
  let excelState: ExcelState
  try {
    excelState = await readExcelState(graphToken)
  } catch (err) {
    return { deleted: false, error: `Failed to read Excel: ${(err as Error).message}` }
  }

  // Find the row index for this event ID
  let targetRowIndex = -1
  for (let i = 1; i < excelState.rows.length; i++) {
    if (String(excelState.rows[i][0]) === eventId) {
      targetRowIndex = i + 1 // 1-based Excel row
      break
    }
  }

  if (targetRowIndex === -1) {
    return { deleted: false, error: `Event ${eventId} not found in sheet` }
  }

  // Delete the row using Graph API
  try {
    const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/worksheets/${encodeURIComponent(SHEET_NAME)}/range(address='A${targetRowIndex}:AB${targetRowIndex}')/delete`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${graphToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shift: 'Up' }),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { deleted: false, error: `Graph API delete failed (${res.status}): ${errText}` }
    }
    return { deleted: true }
  } catch (err) {
    return { deleted: false, error: (err as Error).message }
  }
}

// ---- Main handler ----

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const direction = url.searchParams.get('direction') ?? 'from-excel'
    const eventId = url.searchParams.get('event_id') ?? undefined

    // Auth: require service_role or valid user token
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const graphToken = await getGraphToken()
    const results: Record<string, unknown> = {}

    // Delete: manual only, for dev/test cleanup
    if (direction === 'delete') {
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: 'event_id required for delete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      results.delete = await deleteFromExcel(graphToken, eventId)
      return new Response(JSON.stringify({ ok: true, direction, ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For 'full' sync: from-excel FIRST (Excel is truth), then to-excel
    if (direction === 'from-excel' || direction === 'full') {
      results.fromExcel = await syncFromExcel(supabase, graphToken)
    }

    if (direction === 'to-excel' || direction === 'full') {
      results.toExcel = await syncToExcel(supabase, graphToken, eventId)
    }

    return new Response(JSON.stringify({ ok: true, direction, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
