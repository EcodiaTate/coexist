import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  ArrowLeft,
  CircleDot,
  Save,
  Send,
  Settings,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import {
  useCreateQuiz,
  useSaveQuizQuestions,
  type QuizQuestionInput,
} from '@/hooks/use-admin-development'
import { QuestionBuilder } from '@/components/development/question-builder'

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminCreateQuizPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  useAdminHeader('Create Quiz')

  const createQuiz = useCreateQuiz()
  const saveQuestions = useSaveQuizQuestions()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [passScore, setPassScore] = useState(70)
  const [randomize, setRandomize] = useState(false)
  const [timeLimit, setTimeLimit] = useState('')
  const [maxAttempts, setMaxAttempts] = useState(0)
  const [questions, setQuestions] = useState<QuizQuestionInput[]>([])

  const isSaving = createQuiz.isPending || saveQuestions.isPending
  const canSave = title.trim().length > 0

  const handleSave = useCallback(async () => {
    if (!user || !canSave) return

    try {
      const quiz = await createQuiz.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        pass_score: passScore,
        randomize_questions: randomize,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        max_attempts: maxAttempts,
        created_by: user.id,
      })

      if (questions.length > 0) {
        await saveQuestions.mutateAsync({
          quizId: quiz.id,
          questions,
        })
      }

      toast.success('Quiz created')
      navigate('/admin/development')
    } catch {
      toast.error('Failed to create quiz')
    }
  }, [user, title, description, passScore, randomize, timeLimit, maxAttempts, questions, canSave, createQuiz, saveQuestions, toast, navigate])

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Back */}
      <motion.div variants={fadeUp}>
        <button
          type="button"
          onClick={() => navigate('/admin/development')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </motion.div>

      {/* Settings card */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-gradient-to-br from-white to-primary-50/40 border border-white/60 shadow-sm p-5 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <Settings size={18} className="text-primary-500" />
          <h2 className="font-heading text-base font-bold text-primary-800">Quiz Settings</h2>
        </div>

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Leadership Principles Assessment"
          required
        />

        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">Description (optional)</label>
          <textarea
            className="w-full min-h-[60px] rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this quiz assesses"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Pass Score (%)"
            type="number"
            value={String(passScore)}
            onChange={(e) => setPassScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
          />
          <Input
            label="Time Limit (min)"
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            placeholder="No limit"
          />
          <Input
            label="Max Attempts"
            type="number"
            value={String(maxAttempts)}
            onChange={(e) => setMaxAttempts(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0 = unlimited"
          />
        </div>

        <Toggle
          label="Randomize question order"
          checked={randomize}
          onChange={setRandomize}
        />
      </motion.div>

      {/* Questions */}
      <motion.div variants={fadeUp}>
        <h2 className="flex items-center gap-2 font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
          <CircleDot size={14} className="text-primary-400" />
          Questions
        </h2>
        <QuestionBuilder questions={questions} onChange={setQuestions} />
      </motion.div>

      {/* Sticky bottom bar */}
      <motion.div
        variants={fadeUp}
        className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-white/90 backdrop-blur-md border-t border-primary-100 flex items-center justify-between gap-3"
      >
        <p className="text-xs text-primary-500">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
          {' · '}
          {questions.reduce((sum, q) => sum + (q.points ?? 1), 0)} total points
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/development')}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Save size={14} />}
            onClick={handleSave}
            loading={isSaving}
            disabled={!canSave}
          >
            Save Quiz
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
