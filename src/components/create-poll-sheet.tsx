import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, BarChart3 } from 'lucide-react'
import { CenteredDialog } from '@/components/centered-dialog'
import { Button } from '@/components/button'
import { cn } from '@/lib/cn'

interface CreatePollSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    question: string
    options: string[]
    allowMultiple: boolean
    anonymous: boolean
  }) => void
  loading?: boolean
}

export function CreatePollSheet({ open, onClose, onSubmit, loading }: CreatePollSheetProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [anonymous, setAnonymous] = useState(false)

  const canSubmit = question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      question: question.trim(),
      options: options.filter((o) => o.trim()).map((o) => o.trim()),
      allowMultiple,
      anonymous,
    })
    // Reset
    setQuestion('')
    setOptions(['', ''])
    setAllowMultiple(false)
    setAnonymous(false)
  }

  const addOption = () => {
    if (options.length >= 8) return
    setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  return (
    <CenteredDialog open={open} onClose={onClose}>
      <div className="pb-4">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary-900">Create Poll</h3>
            <p className="text-xs text-primary-400">Ask your collective a question</p>
          </div>
        </div>

        {/* Question */}
        <div className="mb-4">
          <label htmlFor="poll-question" className="text-xs font-semibold text-primary-600 mb-1 block">
            Question
          </label>
          <input
            id="poll-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to ask?"
            maxLength={200}
            className="w-full rounded-xl bg-primary-50/40 px-3.5 py-2.5 text-sm text-primary-800 placeholder:text-primary-400 outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white min-h-11"
          />
        </div>

        {/* Options */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-primary-600 mb-1.5 block">
            Options (min 2, max 8)
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options]
                    newOpts[i] = e.target.value
                    setOptions(newOpts)
                  }}
                  placeholder={`Option ${i + 1}`}
                  maxLength={100}
                  className="flex-1 rounded-xl bg-primary-50/40 px-3 py-2 text-sm text-primary-800 placeholder:text-primary-400 outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white min-h-11"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-error-400 hover:bg-error-50 active:scale-[0.95] transition-all duration-150 cursor-pointer select-none"
                    aria-label={`Remove option ${i + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 8 && (
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-primary-500 hover:text-primary-700 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none min-h-11 px-1"
            >
              <Plus size={14} />
              Add option
            </button>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3 mb-5">
          <label className="flex items-center gap-3 cursor-pointer select-none min-h-11">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="h-5 w-5 rounded text-primary-600 focus:ring-primary-400 accent-primary-600"
            />
            <span className="text-sm text-primary-700">Allow multiple votes</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer select-none min-h-11">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-5 w-5 rounded text-primary-600 focus:ring-primary-400 accent-primary-600"
            />
            <span className="text-sm text-primary-700">Anonymous voting</span>
          </label>
        </div>

        {/* Submit */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          loading={loading}
        >
          Post Poll
        </Button>
      </div>
    </CenteredDialog>
  )
}
