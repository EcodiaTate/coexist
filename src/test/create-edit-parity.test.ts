import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, relative, sep } from 'node:path'
import { CHECKIN_WINDOW_OPTIONS } from '@/pages/events/components/checkin-window-options'

/* ------------------------------------------------------------------ */
/*  create/edit parity: the features and controls that existed on one  */
/*  page only                                                          */
/*                                                                     */
/*  2.F7  cover-image suggestions existed only at creation time, so a   */
/*        leader replacing a published event's cover had to leave the   */
/*        app to find a photo the wizard offers in a row.               */
/*  2.F8  is_public had two unrelated UIs: two labelled cards on        */
/*        create, a bare toggle bundled next to Capacity on edit.       */
/*  2.F9  partner_name sat in edit's "Preparation and Access" card,     */
/*        three sections from the external-collaboration toggle it      */
/*        belongs with; create asks both as one decision.               */
/*  2.F10 the check-in-window dropdown was duplicated verbatim, options  */
/*        and helper copy included.                                     */
/*  2.F3  collaborator invites existed only in chat-room.tsx.           */
/* ------------------------------------------------------------------ */

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8')
const CREATE = 'src/pages/events/create-event.tsx'
const EDIT = 'src/pages/events/edit-event.tsx'
const BOTH = [CREATE, EDIT]

describe('2.F10 check-in window is declared once', () => {
  /* Discovery, not a fixed list: the audit's own probe was
     `grep -n "At event start time" src/pages/events/*.tsx` returning exactly
     two hits. It must now return one, in the shared module. */
  function filesNamingTheOption(): string[] {
    const found: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) { if (entry.name !== 'test') walk(full) }
        else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
          if (readFileSync(full, 'utf8').includes("label: 'At event start time'")) {
            found.push(relative(ROOT, full).split(sep).join('/'))
          }
        }
      }
    }
    walk(resolve(ROOT, 'src'))
    return found.sort()
  }

  it('lives in exactly one file', () => {
    expect(filesNamingTheOption()).toEqual([
      'src/pages/events/components/checkin-window-options.ts',
    ])
  })

  it('keeps both options, so the extraction did not quietly drop one', () => {
    expect(CHECKIN_WINDOW_OPTIONS.map((o) => o.value)).toEqual(['0', '30'])
  })

  it.each(BOTH)('%s renders the shared field', (page) => {
    expect(read(page)).toContain('<CheckinWindowField')
  })

  /* Edit had no explanatory line under its dropdown; sharing the component
     gives it one. Pinned so a future edit does not strip it back out. */
  it('both pages now get the sentence only create used to show', () => {
    expect(read('src/pages/events/components/event-shared-fields.tsx'))
      .toContain('Check-in can open up to 30 minutes before the event starts')
  })
})

describe('2.F8 visibility is one control on both pages', () => {
  it.each(BOTH)('%s renders VisibilityField', (page) => {
    expect(read(page)).toContain('<VisibilityField')
  })

  /* The cards won because they name what the OTHER option does; a toggle
     cannot. Losing either card would silently return to a binary with one
     side unexplained. */
  it('keeps both labelled choices, not a toggle in disguise', () => {
    const shared = read('src/pages/events/components/event-shared-fields.tsx')
    expect(shared).toContain('Anyone can find and register for this event')
    expect(shared).toContain('Only members of the selected collectives can see and register')
  })

  it('DetailsFields no longer carries a second visibility control', () => {
    const fields = read('src/pages/events/components/event-form-fields.tsx')
    const details = fields.slice(
      fields.indexOf('export function DetailsFields'),
      fields.indexOf('export function ExtrasFields'),
    )
    expect(details).not.toContain('is_public')
  })
})

describe('2.F9 partner sits with the decision it belongs to', () => {
  /* Scoped to the JSX, because `is_external_collaboration` also appears in the
     hydration and both save payloads far above the render. A bare indexOf
     found the hydration and compared the wrong things. */
  it('edit renders partner_name inside the external-collaboration card', () => {
    const body = read(EDIT)
    const card = body.slice(
      body.indexOf('Partner &amp; External Collaboration'),
      body.indexOf('</motion.div>', body.indexOf('External Registration URL')),
    )
    expect(card).toContain('value={form.fields.extras.partner_name}')
    expect(card).toContain('checked={form.fields.is_external_collaboration}')
  })

  it('the preparation card no longer renders partner at all', () => {
    const body = read(EDIT)
    const prep = body.slice(body.indexOf('<ExtrasFields'), body.indexOf('{/* Cover Image */}'))
    expect(prep).not.toContain('partner_name')
  })

  it('ExtrasFields omits partner for that caller rather than rendering it twice', () => {
    expect(read(EDIT)).toContain('includePartner={false}')
  })

  /* The flag must default to rendering it: ExtrasFields is a shared component
     and a future caller that says nothing should get the whole shape. */
  it('still renders partner for callers that do not opt out', () => {
    expect(read('src/pages/events/components/event-form-fields.tsx'))
      .toContain('includePartner = true')
  })
})

describe('2.F7 cover suggestions reach both pages', () => {
  it.each(BOTH)('%s renders CoverImageSuggestions', (page) => {
    expect(read(page)).toContain('<CoverImageSuggestions')
  })

  it('edit feeds it this event\'s own collective and activity type', () => {
    const body = read(EDIT)
    expect(body).toContain('useCoverImageSuggestions({')
    expect(body).toContain('collectiveIds: event?.collective_id ? [event.collective_id] : []')
    expect(body).toContain('activityType: form.fields.activity_type')
  })

  it('is declared once, not copied into edit', () => {
    expect(read(CREATE)).not.toContain('function CoverImageSuggestions(')
    expect(read(EDIT)).not.toContain('function CoverImageSuggestions(')
    expect(read('src/pages/events/components/event-shared-fields.tsx'))
      .toContain('export function CoverImageSuggestions(')
  })
})

describe('2.F3 collaborator invites are reachable from the edit form', () => {
  it('edit renders the collaborators card', () => {
    expect(read(EDIT)).toContain('<EventCollaboratorsCard')
  })

  it('reuses the existing RPC path rather than a second invite mechanism', () => {
    const card = read('src/pages/events/components/event-collaborators-card.tsx')
    expect(card).toContain('useInviteCollaborator')
    expect(card).toContain('useOutgoingCollaborations')
    // The RPC itself is untouched: the card must not talk to the table direct.
    expect(card).not.toContain("from('collective_event_collaborators')")
  })

  /* Primary-host reassignment stays out: collective_id gates RLS host
     permissions across the codebase, so it is a product decision, not a form
     gap. The card must not quietly grow it. */
  it('does not touch the primary host collective', () => {
    const card = read('src/pages/events/components/event-collaborators-card.tsx')
    expect(card).not.toContain('collective_id:')
    expect(card).toContain('cannot be changed here')
  })

  it('does not re-offer a collective already invited to this event', () => {
    expect(read('src/pages/events/components/event-collaborators-card.tsx'))
      .toContain('const taken = new Set([hostCollectiveId, ...forThisEvent.map((c) => c.collective_id)])')
  })

  it('scopes the list to this event, not every invite the collective ever sent', () => {
    expect(read('src/pages/events/components/event-collaborators-card.tsx'))
      .toContain('.filter((c) => c.event_id === eventId)')
  })
})
