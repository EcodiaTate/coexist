import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, relative, sep } from 'node:path'
import { TicketQuestionsEditor } from '@/pages/events/components/ticket-questions-editor'
import { makeQuestionDraft } from '@/pages/events/components/ticket-question-options'
import type { TicketQuestionDraft } from '@/hooks/use-event-ticket-questions'

/* ------------------------------------------------------------------ */
/*  Attendee questions were creatable and then frozen                  */
/*                                                                     */
/*  The defect (audit finding 2.F2, live at 0c9302db). Commit e6f3e562  */
/*  built useEventTicketQuestions and useSaveTicketQuestions together;  */
/*  commit 7c0861f7 wired only the create-side UI. The save hook was    */
/*  left with ZERO callers, edit-event.tsx had no questions section at  */
/*  all, and the only way to fix a typo in a published event's question */
/*  was to delete the ticket type and rebuild it, which drops that      */
/*  tier's sales history.                                              */
/*                                                                     */
/*  Riding on it: create's local draft type had no help_text, and the   */
/*  raw insert never set it, so the column, the read type and the       */
/*  renderer at ticket-questions-modal.tsx:60 all existed with no UI    */
/*  anywhere in the app that could put a value in it.                   */
/* ------------------------------------------------------------------ */

const ROOT = resolve(__dirname, '../..')
const readSrc = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8')

function draft(overrides: Partial<TicketQuestionDraft> = {}): TicketQuestionDraft {
  return { ...makeQuestionDraft(0), id: 'q-1', prompt: 'Arriving by 4WD?', ...overrides }
}

describe('TicketQuestionsEditor', () => {
  it('offers a help-text input, the field no UI could reach before', () => {
    render(<TicketQuestionsEditor questions={[draft()]} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Help text/i)).toBeInTheDocument()
  })

  it('reports a help-text edit upward so it can be persisted', () => {
    const onChange = vi.fn()
    render(<TicketQuestionsEditor questions={[draft()]} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/Help text/i), {
      target: { value: 'Tick only if you are towing' },
    })
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ help_text: 'Tick only if you are towing' }),
    ])
  })

  /* The soft-delete IS the feature. event_tickets.custom_answers reference the
     question id, so a hard delete would strand every historic answer. Dropping
     the row from the array without reporting the id leaves it is_active in the
     database and it reappears on the next load. */
  it('reports a persisted removal upward instead of only dropping it locally', () => {
    const onChange = vi.fn()
    const onRemovePersisted = vi.fn()
    render(
      <TicketQuestionsEditor
        questions={[draft({ _persisted: true })]}
        onChange={onChange}
        onRemovePersisted={onRemovePersisted}
      />,
    )
    fireEvent.click(screen.getByLabelText('Remove question'))
    expect(onRemovePersisted).toHaveBeenCalledWith('q-1')
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('does not report a never-saved question as a removal', () => {
    const onRemovePersisted = vi.fn()
    render(
      <TicketQuestionsEditor
        questions={[draft()]}
        onChange={vi.fn()}
        onRemovePersisted={onRemovePersisted}
      />,
    )
    fireEvent.click(screen.getByLabelText('Remove question'))
    expect(onRemovePersisted).not.toHaveBeenCalled()
  })

  it('adds a complete draft, help_text and sort_order included', () => {
    const onChange = vi.fn()
    render(<TicketQuestionsEditor questions={[draft()]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Add a question/i }))
    const added = onChange.mock.calls[0][0][1]
    expect(added).toMatchObject({ prompt: '', help_text: '', sort_order: 1 })
  })

  it('offers options only for the select types', () => {
    const { rerender } = render(
      <TicketQuestionsEditor questions={[draft({ question_type: 'short_text' })]} onChange={vi.fn()} />,
    )
    expect(screen.queryByPlaceholderText(/Options, comma separated/i)).not.toBeInTheDocument()
    rerender(
      <TicketQuestionsEditor questions={[draft({ question_type: 'single_select' })]} onChange={vi.fn()} />,
    )
    expect(screen.getByPlaceholderText(/Options, comma separated/i)).toBeInTheDocument()
  })
})

/* ------------------------------------------------------------------ */
/*  The wiring guards                                                  */
/* ------------------------------------------------------------------ */

describe('the questions save hook is reachable from both pages', () => {
  // The hook sat with zero callers for two months. A census, not a hard-coded
  // list, so deleting a call site is what fails rather than a stale expectation.
  function callers(): string[] {
    const found: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) { if (entry.name !== 'test') walk(full) }
        else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
          const body = readFileSync(full, 'utf8')
          // The hook's own module names itself; a definition is not a caller.
          const isDefinition = /export function useSaveTicketQuestions/.test(body)
          if (!isDefinition && /useSaveTicketQuestions\(\)/.test(body)) {
            found.push(relative(ROOT, full).split(sep).join('/'))
          }
        }
      }
    }
    walk(resolve(ROOT, 'src'))
    return found.sort()
  }

  it('is called from create AND edit, not from neither', () => {
    expect(callers()).toEqual([
      'src/pages/events/create-event.tsx',
      'src/pages/events/edit-event.tsx',
    ])
  })

  /* Edit must hydrate with _persisted so the mutation UPDATEs rather than
     inserting a duplicate of every question on each save.

     Scoped to the QUESTIONS hydration block on purpose: a bare
     `toMatch(/_persisted: true/)` over the whole file passes on the tier
     hydration alone, so it would have gone on passing with the questions
     half deleted. Caught by mutating exactly that. */
  it('edit hydrates existing questions as persisted rows', () => {
    const body = readSrc('src/pages/events/edit-event.tsx')
    expect(body).toContain('useEventTicketQuestions(eventId)')
    expect(body).toContain('removedIds: removedQuestionIds')

    const block = body.slice(
      body.indexOf('existingQuestions.map('),
      body.indexOf('// Shared cover resolution'),
    )
    expect(block).toContain('existingQuestions.map(')
    expect(block).toContain('_persisted: true')
    // help_text must survive the round trip, not be dropped on load.
    expect(block).toContain('help_text: q.help_text')
  })

  /* Both pages render the same editor. A second copy of the markup is how the
     help_text drift happened in the first place, and is the shape of 2.F10. */
  it('both pages use the one shared editor component', () => {
    for (const page of ['src/pages/events/create-event.tsx', 'src/pages/events/edit-event.tsx']) {
      expect(readSrc(page)).toContain('<TicketQuestionsEditor')
    }
  })

  it('neither page still declares its own question draft type', () => {
    for (const page of ['src/pages/events/create-event.tsx', 'src/pages/events/edit-event.tsx']) {
      expect(readSrc(page)).not.toMatch(/^interface TicketQuestionDraft/m)
      expect(readSrc(page)).not.toMatch(/^interface TicketTierDraft/m)
    }
  })
})
