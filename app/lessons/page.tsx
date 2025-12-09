'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Lesson {
  id: string
  title: string
  content: string
  difficulty: string
  topic: string | null
}

export default function LessonsPage() {
  const router = useRouter()

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  // new-lesson UI state
  const [newTopic, setNewTopic] = useState('')
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'normal' | 'hard'>(
    'normal'
  )
  const [newLearningStyle, setNewLearningStyle] = useState<
    'visual' | 'verbal' | 'step-by-step' | 'short-summaries'
  >('verbal')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // --------------------------------------------------
  // Load existing lessons
  // --------------------------------------------------
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('Supabase error:', error)
          // silent fail → show empty state
          return
        }

        setLessons(data || [])
      } catch (err) {
        console.error('Error fetching lessons:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLessons()
  }, [])

  // --------------------------------------------------
  // Handle “Generate new lesson”
  // --------------------------------------------------
  const handleCreateLesson = async (e: FormEvent) => {
    e.preventDefault()
    const topic = newTopic.trim()
    if (!topic || creating) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/lesson-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          difficulty: newDifficulty,
          learningStyle: newLearningStyle,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const msg =
          errorData.error ||
          errorData.details ||
          `HTTP ${res.status}: ${res.statusText}`
        console.error('Lesson generation failed:', msg)
        setCreateError(msg)
        return
      }

      const data = await res.json()
      const created: Lesson | undefined = data.lesson

      if (!created) {
        setCreateError('A szerver nem adott vissza tananyagot.')
        return
      }

      // Put new lesson at the top of the list
      setLessons((prev) => [created, ...prev])
      setNewTopic('')

      // Jump straight to the new lesson page
      router.push(`/lesson/${created.id}`)
    } catch (err) {
      console.error('Error creating lesson:', err)
      setCreateError('Hiba történt a tananyag generálása közben.')
    } finally {
      setCreating(false)
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Betöltés...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Történelem Tananyagok
        </h1>

        {/* --------------------------------------------------
            New lesson generator (Option C)
        -------------------------------------------------- */}
        <section className="bg-white rounded-lg shadow-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold mb-3 text-indigo-700">
            Új tananyag generálása
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Írd be, mit szeretnél tanulni. Az AI elkészít egy személyre szabott
            történelem tananyagot, majd automatikusan hozzáadja a listához.
          </p>

          <form
            onSubmit={handleCreateLesson}
            className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-3"
          >
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téma
              </label>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder='Pl.: "Az első világháború okai"'
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nehézség
              </label>
              <select
                value={newDifficulty}
                onChange={(e) =>
                  setNewDifficulty(e.target.value as 'easy' | 'normal' | 'hard')
                }
                className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Könnyű</option>
                <option value="normal">Közepes</option>
                <option value="hard">Nehéz</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tanulási stílus
              </label>
              <select
                value={newLearningStyle}
                onChange={(e) =>
                  setNewLearningStyle(
                    e.target.value as
                      | 'visual'
                      | 'verbal'
                      | 'step-by-step'
                      | 'short-summaries'
                  )
                }
                className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="verbal">Magyarázó szöveg</option>
                <option value="visual">Vizualizáció-központú</option>
                <option value="step-by-step">Lépésről lépésre</option>
                <option value="short-summaries">Rövid összefoglalók</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!newTopic.trim() || creating}
              className="mt-2 md:mt-0 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {creating ? 'Generálás…' : 'Tananyag létrehozása'}
            </button>
          </form>

          {createError && (
            <p className="mt-3 text-sm text-red-600">{createError}</p>
          )}
        </section>

        {/* --------------------------------------------------
            Existing lessons list
        -------------------------------------------------- */}
        {lessons.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">Még nincsenek tananyagok.</p>
            <p className="text-sm text-gray-500">
              Kezdd az első tananyag generálásával a fenti űrlapon!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lesson/${lesson.id}`}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer flex flex-col"
              >
                <h2 className="text-2xl font-semibold mb-2 text-indigo-600 line-clamp-2">
                  {lesson.title}
                </h2>

                {lesson.topic && (
                  <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded mb-2">
                    {lesson.topic}
                  </span>
                )}

                <span
                  className={`inline-block text-xs px-2 py-1 rounded mb-3 ${
                    lesson.difficulty === 'easy'
                      ? 'bg-green-100 text-green-800'
                      : lesson.difficulty === 'hard'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {lesson.difficulty === 'easy'
                    ? 'Könnyű'
                    : lesson.difficulty === 'hard'
                    ? 'Nehéz'
                    : 'Közepes'}
                </span>

                <p className="text-gray-600 text-sm line-clamp-3 flex-1">
                  {lesson.content.substring(0, 180)}…
                </p>

                <div className="mt-4 text-indigo-600 font-medium text-sm">
                  Olvasás →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
