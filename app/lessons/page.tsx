'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Lesson {
  id: string
  title: string
  content: string
  difficulty: string
  topic: string | null
}


export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("updated_at", { ascending: false });
  
      setLessons(data || []);
      setLoading(false);        // ← YOU FORGOT THIS
    };
  
    fetchLessons();
  }, []);
  

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Betöltés...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Történelem Tananyagok</h1>

        {lessons.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">Még nincsenek tananyagok.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-800 font-semibold mb-2">ℹ️ Beállítási információk</p>
              <p className="text-xs text-blue-700 mb-2">
                Ha még nem állítottad be a Supabase-t:
              </p>
              <ol className="text-xs text-blue-700 text-left list-decimal list-inside space-y-1 max-w-xl mx-auto">
                <li>Hozz létre egy <code className="bg-blue-100 px-1 rounded">.env.local</code> fájlt a projekt gyökerében</li>
                <li>Add hozzá a Supabase URL-t és API kulcsokat</li>
                <li>Futtasd le a <code className="bg-blue-100 px-1 rounded">db/schema.sql</code> fájlt a Supabase SQL Editor-ben</li>
                <li>Futtasd le a <code className="bg-blue-100 px-1 rounded">db/seed.sql</code> fájlt példa adatokért</li>
                <li>Lásd a <code className="bg-blue-100 px-1 rounded">SETUP.md</code> fájlt részletes útmutatásért</li>
              </ol>
            </div>
            <p className="text-sm text-gray-500">
              Hozz létre tananyagokat a Supabase adatbázisban, vagy használd a seed scriptet.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lesson/${lesson.id}`}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer"
              >
                <h2 className="text-2xl font-semibold mb-2 text-indigo-600">{lesson.title}</h2>
                {lesson.topic && (
                  <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded mb-3">
                    {lesson.topic}
                  </span>
                )}
                <span
                  className={`inline-block text-xs px-2 py-1 rounded mb-3 ml-2 ${
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
                <p className="text-gray-600 line-clamp-3">
                  {lesson.content.substring(0, 150)}...
                </p>
                <div className="mt-4 text-indigo-600 font-medium">
                  Olvasás →{' '}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

