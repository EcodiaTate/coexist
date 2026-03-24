import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Trophy,
  RotateCcw,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { QuizQuestionCard } from '@/components/development/quiz-question-card'
import { cn } from '@/lib/cn'
import { useDevQuiz, useDevQuizQuestions } from '@/hooks/use-admin-development'
import { useSubmitQuiz, useQuizAttempts } from '@/hooks/use-development-progress'

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LearnQuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const [searchParams] = useSearchParams()
  const moduleId = searchParams.get('moduleId')
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const toast = useToast()

  const { data: quiz, isLoading: quizLoading } = useDevQuiz(quizId)
  const { data: questions = [], isLoading: questionsLoading } = useDevQuizQuestions(quizId)
  const { data: attempts = [] } = useQuizAttempts(quizId)
  const submitQuiz = useSubmitQuiz()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, { selectedOptionIds: string[]; textResponse?: string }>>(new Map())
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<{ score: number; passed: boolean; total: number; earned: number } | null>(null)
  const timerRef = useRef(0)

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) timerRef.current += 1
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Randomize if needed
  const orderedQuestions = useMemo(() => {
    if (quiz?.randomize_questions) {
      return [...questions].sort(() => Math.random() - 0.5)
    }
    return questions
  }, [questions, quiz?.randomize_questions])

  const currentQuestion = orderedQuestions[currentIndex]
  const isLastQuestion = currentIndex === orderedQuestions.length - 1
  const allAnswered = answers.size === orderedQuestions.length

  const handleAnswer = useCallback(
    (selectedOptionIds: string[], textResponse?: string) => {
      if (!currentQuestion) return
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(currentQuestion.id, { selectedOptionIds, textResponse })
        return next
      })
    },
    [currentQuestion],
  )

  const handleNext = () => {
    if (isLastQuestion && allAnswered) {
      handleSubmit()
    } else if (!isLastQuestion) {
      setCurrentIndex((i) => i + 1)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!quiz || !quizId) return

    const totalPoints = orderedQuestions.reduce((sum, q) => sum + (q.points ?? 1), 0)
    let earnedPoints = 0

    const responses = orderedQuestions.map((q) => {
      const answer = answers.get(q.id)
      const selectedIds = answer?.selectedOptionIds ?? []
      const options = q.options ?? []

      let isCorrect = false
      if (q.question_type === 'short_answer') {
        // Short answer graded as always correct for now (admin reviews manually)
        isCorrect = true
      } else {
        const correctIds = new Set(options.filter((o) => o.is_correct).map((o) => o.id))
        const selectedSet = new Set(selectedIds)
        isCorrect =
          correctIds.size === selectedSet.size &&
          [...correctIds].every((id) => selectedSet.has(id))
      }

      const pts = isCorrect ? (q.points ?? 1) : 0
      earnedPoints += pts

      return {
        question_id: q.id,
        selected_option_ids: selectedIds,
        text_response: answer?.textResponse,
        is_correct: isCorrect,
        points_earned: pts,
      }
    })

    const scorePct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const passed = scorePct >= (quiz.pass_score ?? 70)

    try {
      await submitQuiz.mutateAsync({
        quiz_id: quizId,
        module_id: moduleId,
        score_pct: scorePct,
        points_earned: earnedPoints,
        points_total: totalPoints,
        passed,
        time_spent_sec: timerRef.current,
        responses,
      })

      setResults({ score: scorePct, passed, total: totalPoints, earned: earnedPoints })
      setShowResults(true)
    } catch {
      toast.error('Failed to submit quiz')
    }
  }, [quiz, quizId, moduleId, orderedQuestions, answers, submitQuiz, toast])

  const isLoading = quizLoading || questionsLoading

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-primary-500">Quiz not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mt-3">
          Go Back
        </Button>
      </div>
    )
  }

  // Results screen
  if (showResults && results) {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <motion.div
          initial={rm ? {} : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-gradient-to-br from-white to-primary-50/40 border border-white/60 shadow-sm p-8 text-center"
        >
          <div
            className={cn(
              'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4',
              results.passed ? 'bg-moss-100' : 'bg-bark-100',
            )}
          >
            {results.passed ? (
              <Trophy size={28} className="text-moss-600" />
            ) : (
              <RotateCcw size={28} className="text-bark-600" />
            )}
          </div>

          <h2 className="font-heading text-2xl font-bold text-primary-800 mb-1">
            {results.passed ? 'Congratulations!' : 'Keep Going!'}
          </h2>
          <p className="text-sm text-primary-500 mb-6">
            {results.passed
              ? 'You passed the quiz successfully'
              : `You need ${quiz.pass_score}% to pass. Try again!`}
          </p>

          {/* Score */}
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-white border border-primary-100 mb-6">
            <div className="text-center">
              <p className={cn('text-3xl font-bold tabular-nums', results.passed ? 'text-moss-600' : 'text-bark-600')}>
                {results.score}%
              </p>
              <p className="text-xs text-primary-400 mt-0.5">Score</p>
            </div>
            <div className="w-px h-10 bg-primary-200" />
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-700 tabular-nums">
                {results.earned}/{results.total}
              </p>
              <p className="text-xs text-primary-400 mt-0.5">Points</p>
            </div>
          </div>

          {/* Per-question breakdown */}
          <div className="space-y-2 text-left mb-6 max-h-60 overflow-y-auto">
            {orderedQuestions.map((q, i) => {
              const answer = answers.get(q.id)
              const selectedIds = new Set(answer?.selectedOptionIds ?? [])
              const correctIds = new Set((q.options ?? []).filter((o) => o.is_correct).map((o) => o.id))
              const isCorrect =
                q.question_type === 'short_answer' ||
                (correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id)))

              return (
                <div key={q.id} className="flex items-start gap-2 py-2 border-b border-primary-100 last:border-0">
                  <div
                    className={cn(
                      'flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5',
                      isCorrect ? 'bg-moss-100 text-moss-600' : 'bg-red-100 text-red-500',
                    )}
                  >
                    {isCorrect ? <Check size={10} /> : <X size={10} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary-700 line-clamp-1">
                      Q{i + 1}: {q.question_text}
                    </p>
                  </div>
                  <span className="text-xs text-primary-400 tabular-nums shrink-0">
                    {isCorrect ? q.points ?? 1 : 0}/{q.points ?? 1}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            {!results.passed && (
              <Button
                variant="secondary"
                size="md"
                icon={<RotateCcw size={14} />}
                onClick={() => {
                  setShowResults(false)
                  setResults(null)
                  setCurrentIndex(0)
                  setAnswers(new Map())
                  timerRef.current = 0
                }}
              >
                Try Again
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (moduleId) {
                  navigate(`/learn/complete?type=module&id=${moduleId}`)
                } else {
                  navigate('/learn')
                }
              }}
            >
              {results.passed ? 'Continue' : 'Back to Learning'}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Quiz questions
  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-primary-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary-800">{quiz.title}</p>
          <p className="text-xs text-primary-400">
            Question {currentIndex + 1} of {orderedQuestions.length}
          </p>
        </div>
        {quiz.time_limit_minutes && (
          <div className="flex items-center gap-1 text-xs text-primary-500">
            <Clock size={12} />
            {quiz.time_limit_minutes}m
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-primary-100 overflow-hidden mb-8">
        <motion.div
          className="h-full rounded-full bg-primary-500"
          animate={{ width: `${((currentIndex + 1) / orderedQuestions.length) * 100}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div
            key={currentQuestion.id}
            initial={rm ? {} : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={rm ? {} : { opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <QuizQuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              showFeedback
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={14} />}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<ArrowRight size={14} />}
          onClick={handleNext}
          disabled={!answers.has(currentQuestion?.id ?? '')}
          loading={submitQuiz.isPending}
        >
          {isLastQuestion && allAnswered ? 'Submit Quiz' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
