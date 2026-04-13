/**
 * excel-sync - Supabase Edge Function
 *
 * Bidirectional sync between Co-Exist Supabase database and the
 * "Master Impact Data Sheet.xlsx" on SharePoint (OneDrive for Business).
 *
 * Directions:
 *   POST /excel-sync?direction=to-excel    -> push survey responses to Excel
 *   POST /excel-sync?direction=from-excel  -> pull Excel changes into Supabase
 *   POST /excel-sync?direction=full        -> both directions
 *   POST /excel-sync?event_id=xxx          -> sync a single event to Excel
 *
 * Column mapping (28 columns, A-AB on "Post Event Review" sheet):
 *   0:  ID                    <- event.id (or legacy ID from sheet)
 *   1:  Event Title           <- events.title
 *   2:  Date of Event         <- events.date_start (Excel serial number)
 *   3:  Collective            <- collectives.name
 *   4:  Location              <- events.address
 *   5:  Postcode              <- extracted from address
 *   6:  Primary Organiser     <- profiles.display_name (events.created_by)
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
  // Excel epoch is 1900-01-01, but has a leap year bug (day 60 = Feb 29 1900 which doesn't exist)
  const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
  const diffMs = date.getTime() - excelEpoch.getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

/** Convert Excel serial number to ISO date */
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
    extractPostcode(e.address ?? ''),                        // 5: Postcode
    e.creator_name ?? '',                                    // 6: Primary Organiser
    (e.answers?.q1 as string) ?? '',                         // 7: Other Group Attended
    (e.answers?.q2 as string) ?? '',                         // 8: Which Landcare Group
    (e.answers?.q3 as string) ?? '',                         // 9: Which OzFish group
    e.leader_name ?? e.creator_name ?? '',                   // 10: Co-Exist Leader
    e.attendees ?? '',                                       // 11: Number of Attendees
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
  // Get event
  const { data: event } = await supabase
    .from('events')
    .select('id, title, date_start, activity_type, address, collective_id, created_by')
    .eq('id', eventId)
    .single()

  if (!event) return null

  // Get collective name
  const { data: collective } = await supabase
    .from('collectives')
    .select('name')
    .eq('id', event.collective_id)
    .single()

  // Get creator profile
  const { data: creator } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', event.created_by)
    .single()

  // Get event impact
  const { data: impact } = await supabase
    .from('event_impact')
    .select('attendees, rubbish_kg, trees_planted, logged_by')
    .eq('event_id', eventId)
    .single()

  // Get leader name if different from creator
  let leaderName = creator?.display_name ?? ''
  if (impact?.logged_by && impact.logged_by !== event.created_by) {
    const { data: leader } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', impact.logged_by)
      .single()
    if (leader) leaderName = leader.display_name
  }

  // Get survey response (latest for this event from any impact survey)
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
    rubbish_kg: impact?.rubbish_kg ?? null,
    trees_planted: impact?.trees_planted ?? null,
    answers,
  }
}

// ---- Sync: Supabase -> Excel ----

async function syncToExcel(
  supabase: ReturnType<typeof createClient>,
  graphToken: string,
  eventId?: string,
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = []
  let synced = 0

  // Read existing Excel data to find which events are already there
  let existingIds: Set<string> = new Set()
  let existingRowCount = 1 // header row
  try {
    const usedRange = await graphRequest(graphToken, '/usedRange(select=values)')
    const rows = usedRange.values ?? []
    existingRowCount = rows.length
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) existingIds.add(String(rows[i][0]))
    }
  } catch (err) {
    errors.push(`Failed to read existing Excel data: ${(err as Error).message}`)
    return { synced, errors }
  }

  // Determine which events to sync
  let eventIds: string[] = []
  if (eventId) {
    eventIds = [eventId]
  } else {
    // Get all events with impact data that aren't in the sheet yet
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'completed')
      .not('id', 'in', `(${Array.from(existingIds).join(',')})`)
      .order('date_start', { ascending: true })

    // Also re-sync events that DO exist (for updates)
    const { data: impactEvents } = await supabase
      .from('event_impact')
      .select('event_id')
      .order('logged_at', { ascending: false })

    const allIds = new Set<string>()
    events?.forEach((e: { id: string }) => allIds.add(e.id))
    impactEvents?.forEach((e: { event_id: string }) => allIds.add(e.event_id))
    eventIds = Array.from(allIds)
  }

  // Build rows for new events (append) and updated rows (patch)
  const newRows: (string | number | null)[][] = []
  const updateRows: { rowIndex: number; row: (string | number | null)[] }[] = []

  for (const eid of eventIds) {
    try {
      const data = await fetchEventData(supabase, eid)
      if (!data) continue

      const row = buildExcelRow(data)

      if (existingIds.has(eid)) {
        // Find the row index in Excel (1-based, +1 for header)
        // We need to find it from the existing data
        // For now, skip updates in batch mode - only append new
        // Updates handled per-event via eventId param
        if (eventId) {
          // Find row index
          const usedRange = await graphRequest(graphToken, '/usedRange(select=values)')
          const rows = usedRange.values ?? []
          for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][0]) === eid) {
              updateRows.push({ rowIndex: i + 1, row }) // 1-based
              break
            }
          }
        }
      } else {
        newRows.push(row)
      }
      synced++
    } catch (err) {
      errors.push(`Event ${eid}: ${(err as Error).message}`)
    }
  }

  // Append new rows
  if (newRows.length > 0) {
    try {
      const startRow = existingRowCount + 1
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

  return { synced, errors }
}

// ---- Sync: Excel -> Supabase ----

async function syncFromExcel(
  supabase: ReturnType<typeof createClient>,
  graphToken: string,
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = []
  let synced = 0

  // Read all Excel data
  let rows: unknown[][]
  try {
    const usedRange = await graphRequest(graphToken, '/usedRange(select=values)')
    rows = usedRange.values ?? []
  } catch (err) {
    return { synced, errors: [`Failed to read Excel: ${(err as Error).message}`] }
  }

  if (rows.length < 2) return { synced, errors: ['No data rows in Excel'] }

  // Process each data row (skip header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const excelId = String(row[0] ?? '')
    if (!excelId) continue

    try {
      // Check if this ID is a Supabase UUID (new app events) or legacy ID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(excelId)

      if (!isUuid) {
        // Legacy row - skip, we don't write these back to Supabase
        continue
      }

      // Update event_impact with Excel values
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

  return { synced, errors }
}

// ---- Main handler ----

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const direction = url.searchParams.get('direction') ?? 'to-excel'
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

    // Get Graph API token
    const graphToken = await getGraphToken()

    const results: Record<string, unknown> = {}

    if (direction === 'to-excel' || direction === 'full') {
      results.toExcel = await syncToExcel(supabase, graphToken, eventId)
    }

    if (direction === 'from-excel' || direction === 'full') {
      results.fromExcel = await syncFromExcel(supabase, graphToken)
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
