// app/quiz/[lessonId]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { QuizQuestion } from '@/lib/ai'

export default function QuizPage() {
  const params = useParams()
  const lessonId = params.lessonId as string

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)

  const [userId] = useState('00000000-0000-0000-0000-000000000001')
  const [bktStates, setBktStates] = useState<Record<string, number>>({})
  const [bktErrors, setBktErrors] = useState<string[]>([])

  useEffect(() => {
    async function run() {
      try {
        // Ensure baseline exists
        await fetch('/api/bkt/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, pKnown: 0.2 }),
        })

        const response = await fetch('/api/quiz-gen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            lessonId,
            difficulty: 'normal',
            learningStyle: 'verbal',
            numQuestions: 5,
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error || 'Quiz generation failed')
        }

        const data: { questions: QuizQuestion[] } = await response.json()

        const cleanOptions = (options: string[]): string[] =>
          (options || []).map((opt) =>
            (opt || '')
              .replace(/^[\s\-–•]*/, '')
              .replace(/^(?:[A-D]|[1-4])[\.\)\:]\s*/i, '')
              .trim()
          )

        setQuestions(
          (data.questions || []).map((q) => ({
            ...q,
            options: cleanOptions(q.options),
          }))
        )

        ;(window as any).__lastQuiz = data.questions
      } catch (e) {
        console.error('Quiz error:', e)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [lessonId, userId])

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (submitted) return
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: answerIndex }))
  }

  const handleSubmit = async () => {
    if (submitted) return

    let correctCount = 0
    const results: Array<{ skillKey: string; correct: boolean; questionId: string }> = []

    questions.forEach((q, idx) => {
      const isCorrect = selectedAnswers[idx] === q.answer
      if (isCorrect) correctCount++

      const skillKey = (q.skill_key || 'general') as string
      results.push({ skillKey, correct: isCorrect, questionId: String(idx) })
    })

    const calculatedScore = questions.length ? correctCount / questions.length : 0
    setScore(calculatedScore)
    setSubmitted(true)

    const newBktStates: Record<string, number> = {}
    const newErrors: string[] = []

    for (const r of results) {
      try {
        const res = await fetch('/api/bkt/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            skillKey: r.skillKey,
            correct: r.correct,
            lessonId,
            questionId: r.questionId,
          }),
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          newErrors.push(`${r.skillKey}: ${errBody.error || 'BKT update failed'} (${res.status})`)
          continue
        }

        const bktData = await res.json()
        if (typeof bktData.p_new === 'number') {
          newBktStates[r.skillKey] = bktData.p_new
        }
      } catch (e) {
        newErrors.push(`${r.skillKey}: network/error`)
      }
    }

    setBktStates(newBktStates)
    setBktErrors(newErrors)

    // Save quiz attempt
    try {
      await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lessonId,
          answers: selectedAnswers,
          score: calculatedScore,
        }),
      })
    } catch (e) {
      console.error('Error saving quiz attempt:', e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Kvíz generálása...</div>
      </div>
    )
  }

  if (!loading && questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Nem sikerült a kvízt generálni</h1>
          <Link
            href={`/lesson/${lessonId}`}
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Vissza a tananyaghoz
          </Link>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const isLastQuestion = currentQuestion === questions.length - 1
  const allAnswered = Object.keys(selectedAnswers).length === questions.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href={`/lesson/${lessonId}`} className="text-indigo-600 hover:underline mb-4 inline-block">
          ← Vissza a tananyaghoz
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Kvíz</h1>
              <span className="text-sm text-gray-500">
                {currentQuestion + 1} / {questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {submitted && score !== null ? (
            <div className="text-center py-8">
              <div className="text-6xl font-bold mb-4 text-indigo-600">{Math.round(score * 100)}%</div>

              {bktErrors.length > 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <h3 className="font-semibold text-red-700 mb-2">BKT frissítés hibák:</h3>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {bktErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(bktStates).length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                  <h3 className="font-semibold mb-2">Tudásszint a témakörökben:</h3>
                  <div className="space-y-2">
                    {Object.entries(bktStates).map(([skill, pKnown]) => (
                      <div key={skill} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{skill}</span>
                        <span className="text-sm font-medium">{Math.round(pKnown * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 space-x-4">
                <Link
                  href={`/lesson/${lessonId}`}
                  className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                >
                  Újraolvasás
                </Link>
                <button
                  onClick={() => {
                    setCurrentQuestion(0)
                    setSelectedAnswers({})
                    setSubmitted(false)
                    setScore(null)
                    setBktStates({})
                    setBktErrors([])
                  }}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
                >
                  Újra próbálkozás
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">{currentQ.question}</h2>

                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = selectedAnswers[currentQuestion] === idx
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(currentQuestion, idx)}
                        disabled={submitted}
                        className={`w-full text-left p-4 rounded-lg border-2 transition ${
                          isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Előző
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitted}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Beküldés
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Következő →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
