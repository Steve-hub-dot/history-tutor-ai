'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { QuizQuestion } from '@/lib/ai'

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.lessonId as string

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [userId] = useState('00000000-0000-0000-0000-000000000001') // In production, get from auth
  const [bktStates, setBktStates] = useState<Record<string, number>>({})

  useEffect(() => {
    async function generateQuiz() {
      try {
        const response = await fetch("/api/quiz-gen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "00000000-0000-0000-0000-000000000001",  // TODO: replace after auth
            lessonId,
            difficulty: "normal",
            learningStyle: "verbal",
            numQuestions: 5,
          })
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage =
            errorData.error ||
            errorData.details ||
            `HTTP ${response.status}: ${response.statusText}`;
    
          console.error("Quiz generation failed:", errorMessage);
          throw new Error(errorMessage);
        }
    
        const data = await response.json();
        setQuestions(data.questions);
      } catch (err) {
        console.error("Quiz error:", err);
      }
    }    

    generateQuiz()
  }, [lessonId])

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (submitted) return
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: answerIndex }))
  }

  const handleSubmit = async () => {
    if (submitted) return

    // Calculate score
    let correct = 0
    const results: Array<{ skillKey: string; correct: boolean }> = []

    questions.forEach((q, idx) => {
      const isCorrect = selectedAnswers[idx] === q.answer
      if (isCorrect) correct++
      if (q.skill_key) {
        results.push({ skillKey: q.skill_key, correct: isCorrect })
      }
    })

    const calculatedScore = correct / questions.length
    setScore(calculatedScore)
    setSubmitted(true)

    // Update BKT states
    const newBktStates: Record<string, number> = {}
    for (const result of results) {
      try {
        const response = await fetch('/api/bkt/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            skillKey: result.skillKey,
            correct: result.correct,
            lessonId,
          }),
        })

        if (response.ok) {
          const bktData = await response.json()
          newBktStates[result.skillKey] = bktData.p_new
        }
      } catch (error) {
        console.error('Error updating BKT:', error)
      }
    }

    setBktStates(newBktStates)

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
    } catch (error) {
      console.error('Error saving quiz attempt:', error)
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm text-yellow-800 font-semibold mb-2">Lehetséges okok:</p>
            <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
              <li>Az OpenAI API kulcs nincs beállítva a <code className="bg-yellow-100 px-1 rounded">.env.local</code> fájlban</li>
              <li>A Supabase nincs beállítva vagy a tananyag nem található</li>
              <li>Az OpenAI API hívás sikertelen volt (nincs kredit, vagy hálózati hiba)</li>
            </ul>
            <p className="text-xs text-yellow-700 mt-3">
              Ellenőrizd a böngésző konzolt részletesebb hibaüzenetért.
            </p>
          </div>
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
        <Link
          href={`/lesson/${lessonId}`}
          className="text-indigo-600 hover:underline mb-4 inline-block"
        >
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
              <div className="text-6xl font-bold mb-4 text-indigo-600">
                {Math.round(score * 100)}%
              </div>
              <p className="text-xl text-gray-700 mb-6">
                {score >= 0.8
                  ? 'Kiváló! Jól érted a témát! 🎉'
                  : score >= 0.6
                  ? 'Jó, de van még mit tanulnod! 💪'
                  : 'Ne add fel! Próbáld újra! 📚'}
              </p>

              {Object.keys(bktStates).length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Tudásszint a témakörökben:</h3>
                  <div className="space-y-2">
                    {Object.entries(bktStates).map(([skill, pKnown]) => (
                      <div key={skill} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{skill}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                pKnown >= 0.8 ? 'bg-green-500' : pKnown >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${pKnown * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {Math.round(pKnown * 100)}%
                          </span>
                        </div>
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
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  {currentQ.question}
                </h2>
                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = selectedAnswers[currentQuestion] === idx
                    const isCorrect = idx === currentQ.answer
                    const showAnswer = submitted

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(currentQuestion, idx)}
                        disabled={submitted}
                        className={`w-full text-left p-4 rounded-lg border-2 transition ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${
                          showAnswer && isCorrect
                            ? 'border-green-500 bg-green-50'
                            : showAnswer && isSelected && !isCorrect
                            ? 'border-red-500 bg-red-50'
                            : ''
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

