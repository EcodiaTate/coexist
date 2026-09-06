import type {
  TicketQuestionDraft,
  TicketQuestionType,
} from '@/hooks/use-event-ticket-questions'

/**
 * Non-component exports for the shared ticket-questions editor.
 *
 * Split out of the .tsx because react-refresh requires a component file to
 * export only components; a constant sitting beside one breaks fast refresh
 * for the whole module.
 */

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
