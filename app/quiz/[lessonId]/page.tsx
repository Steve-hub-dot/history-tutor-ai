'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { QuizQuestion } from '@/lib/ai'

export default function QuizPage() {
  const params = useParams()
  const lessonId = params.lessonId as string

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    {}
  )
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [userId] = useState('00000000-0000-0000-0000-000000000001')
  const [bktStates, setBktStates] = useState<Record<string, number>>({})
  const [weakSkills, setWeakSkills] = useState<string[]>([])
  const [usedDifficulty, setUsedDifficulty] = useState<string | null>(null)

  /* ----------------------------------------------------
     FUNCTION: fetch quiz from server
  ---------------------------------------------------- */
  async function loadQuiz() {
    setLoading(true)
    setSubmitted(false)
    setScore(null)
    setCurrentQuestion(0)
    setSelectedAnswers({})
    setBktStates({})

    try {
      const response = await fetch('/api/quiz-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lessonId,
          difficulty: null,
          learningStyle: 'verbal',
          numQuestions: 7,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error ||
            errorData.details ||
            `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()
      setQuestions(data.questions || [])
      setWeakSkills(data.weakSkills || [])
      setUsedDifficulty(data.usedDifficulty || null)
    } catch (err) {
      console.error('Quiz load error:', err)
    } finally {
      setLoading(false)
    }
  }

  /* Load FIRST quiz */
  useEffect(() => {
    loadQuiz()
  }, [lessonId, userId])

  /* ----------------------------------------------------
     Handle selecting answers
  ---------------------------------------------------- */
  const handleAnswerSelect = (qIndex: number, aIndex: number) => {
    if (submitted) return
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: aIndex }))
  }

  /* ----------------------------------------------------
     SUBMIT quiz + update BKT + save attempt
  ---------------------------------------------------- */
  const handleSubmit = async () => {
    if (submitted || questions.length === 0) return

    let correct = 0
    const results: Array<{ skillKey: string; correct: boolean }> = []

    questions.forEach((q, idx) => {
      const isCorrect = selectedAnswers[idx] === q.answer
      if (isCorrect) correct++
      if (q.skill_key) {
        results.push({ skillKey: q.skill_key, correct: isCorrect })
      }
    })

    const finalScore = correct / questions.length
    setScore(finalScore)
    setSubmitted(true)

    const newStates: Record<string, number> = {}

    // Update BKT (option B)
    for (const result of results) {
      try {
        const res = await fetch('/api/bkt/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            skillKey: result.skillKey,
            correct: result.correct,
            lessonId,
          }),
        })

        if (res.ok) {
          const bkt = await res.json()
          newStates[result.skillKey] = bkt.p_new
        }
      } catch (err) {
        console.error('BKT update failed:', err)
      }
    }

    setBktStates(newStates)

    // Save quiz attempt
    await fetch('/api/quiz/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        lessonId,
        answers: selectedAnswers,
        score: finalScore,
      }),
    })
  }

  /* ----------------------------------------------------
     UI: Loading State
  ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-800">Kvíz generálása...</div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Nem sikerült a kvízt generálni
          </h1>
          <Link
            href={`/lesson/${lessonId}`}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg"
          >
            Vissza a tananyaghoz
          </Link>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const isLast = currentQuestion === questions.length - 1
  const allAnswered =
    Object.keys(selectedAnswers).length === questions.length

  /* ----------------------------------------------------
     RENDER
  ---------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">

        <Link
          href={`/lesson/${lessonId}`}
          className="text-indigo-700 font-medium mb-4 inline-block"
        >
          ← Vissza
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl mx-auto text-gray-900">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Kvíz</h1>
            {usedDifficulty && (
              <p className="text-sm text-gray-700 mt-1">
                Nehézség: <b>{usedDifficulty}</b>
              </p>
            )}
            {weakSkills.length > 0 && (
              <p className="text-xs text-gray-700 mt-1">
                Fókuszált témák: {weakSkills.join(', ')}
              </p>
            )}
          </div>

          {/* Result view */}
          {submitted && score !== null ? (
            <div className="text-center py-8">
              <div className="text-6xl font-bold mb-4 text-indigo-600">
                {Math.round(score * 100)}%
              </div>

              {/* BKT scoreboard */}
              {Object.keys(bktStates).length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Tudásszint témakörönként:
                  </h3>
                  {Object.entries(bktStates).map(([skill, p]) => (
                    <div key={skill} className="flex items-center gap-2 mb-2">
                      <span className="text-sm w-40">{skill}</span>
                      <div className="w-40 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-indigo-600"
                          style={{ width: `${p * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-10">
                        {Math.round(p * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="mt-8 space-x-3 flex justify-center">

                {/* 🔥 NEW BUTTON: Generate follow-up quiz */}
                <button
                  onClick={() => loadQuiz()}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                >
                  Új kvíz a gyenge témákból →
                </button>

                <Link
                  href={`/lesson/${lessonId}`}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
                >
                  Újraolvasás
                </Link>
              </div>
            </div>
          ) : (
            /* Question view */
            <>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                {currentQ.question}
              </h2>

              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt, idx) => {
                  const selected = selectedAnswers[currentQuestion] === idx

                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        handleAnswerSelect(currentQuestion, idx)
                      }
                      disabled={submitted}
                      className={`w-full text-left p-4 rounded-lg border-2 transition 
                        ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() =>
                    setCurrentQuestion(Math.max(0, currentQuestion - 1))
                  }
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg disabled:opacity-50"
                >
                  ← Előző
                </button>

                {isLast ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Beküldés
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setCurrentQuestion(currentQuestion + 1)
                    }
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
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
