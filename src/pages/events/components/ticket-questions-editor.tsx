import { motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Dropdown, Toggle } from '@/components'
import type {
  TicketQuestionDraft,
  TicketQuestionType,
} from '@/hooks/use-event-ticket-questions'

/* ------------------------------------------------------------------ */
/*  Attendee-questions editor, shared by create-event and edit-event   */
/*                                                                     */
/*  Questions were creatable and then frozen: create-event owned the    */
/*  only editor, useSaveTicketQuestions had zero callers, and editing a */
/*  question after publishing meant deleting the ticket type and        */
/*  rebuilding it, which drops the sales history on that tier           */
/*  (finding 2.F2). Edit needed this card. It gets the component rather */
/*  than a copy of the markup, because a second copy is the same shape  */
/*  as the check-in-window dropdown the audit also flags (2.F10).       */
/* ------------------------------------------------------------------ */

export const QUESTION_TYPE_LABELS: { value: TicketQuestionType; label: string }[] = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'single_select', label: 'Pick one' },
  { value: 'multi_select', label: 'Pick many' },
]

export const QUESTION_SELECT_TYPES: TicketQuestionType[] = ['single_select', 'multi_select']

export function makeQuestionDraft(sortOrder: number): TicketQuestionDraft {
  return {
    id: crypto.randomUUID(),
    prompt: '',
    help_text: '',
    question_type: 'short_text',
    options: [],
    required: false,
    sort_order: sortOrder,
  }
}

export interface TicketQuestionsEditorProps {
  questions: TicketQuestionDraft[]
  onChange: (next: TicketQuestionDraft[]) => void
  /**
   * Edit-side only. A question that already exists in the database is
   * soft-deleted through removedIds so historic answers stay resolvable;
   * dropping it from the array alone would leave the row live.
   */
  onRemovePersisted?: (id: string) => void
}

export function TicketQuestionsEditor({
  questions,
  onChange,
  onRemovePersisted,
}: TicketQuestionsEditorProps) {
  const update = (id: string, patch: Partial<TicketQuestionDraft>) =>
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const remove = (q: TicketQuestionDraft) => {
    if (q._persisted && onRemovePersisted) onRemovePersisted(q.id)
    onChange(questions.filter((x) => x.id !== q.id))
  }

  return (
    <>
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <motion.div
            key={q.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="rounded-sm bg-white border border-neutral-100 p-3.5 space-y-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-sm bg-bark-100 text-bark-600 text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <Input
                value={q.prompt}
                onChange={(e) => update(q.id, { prompt: e.target.value })}
                placeholder="Question (e.g. Arriving by 4WD?)"
                compact
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => remove(q)}
                className="flex items-center justify-center min-w-9 min-h-9 rounded-sm text-neutral-300 hover:bg-error-50 hover:text-error-600 active:bg-error-100 transition-colors cursor-pointer"
                aria-label="Remove question"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <Input
              value={q.help_text}
              onChange={(e) => update(q.id, { help_text: e.target.value })}
              placeholder="Help text (optional, shown under the question)"
              compact
            />

            <div className="flex items-center gap-2">
              <Dropdown
                value={q.question_type}
                onChange={(v) => update(q.id, { question_type: v as TicketQuestionType })}
                options={QUESTION_TYPE_LABELS}
                placeholder="Question type"
                size="sm"
                className="w-auto"
              />
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-500 ml-auto">
                Required
                <Toggle checked={q.required} onChange={(checked) => update(q.id, { required: checked })} />
              </label>
            </div>

            {QUESTION_SELECT_TYPES.includes(q.question_type) && (
              <Input
                value={q.options.join(', ')}
                onChange={(e) =>
                  update(q.id, {
                    options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                  })
                }
                placeholder="Options, comma separated (e.g. Tent, Swag, Cabin)"
                compact
              />
            )}
          </motion.div>
        ))}
      </div>

      <Button
        variant="secondary"
        size="sm"
        icon={<Plus size={14} />}
        onClick={() => onChange([...questions, makeQuestionDraft(questions.length)])}
        className="mt-3 w-full"
      >
        Add a question
      </Button>
    </>
  )
}
