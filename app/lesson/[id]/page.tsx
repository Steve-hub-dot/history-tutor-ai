'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Lesson {
  id: string
  title: string
  content: string
  difficulty: string
  topic: string | null
}

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.id as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId] = useState('00000000-0000-0000-0000-000000000001') // In production, get from auth
  const [scrollDepth, setScrollDepth] = useState(0)
  const [startTime] = useState(Date.now())
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true;
  
    async function fetchLesson() {
      try {
        const { data } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .single();
  
        if (data) {
          if (isMounted) {
            setLesson(data);
            setLoading(false);
          }
          return;
        }
  
        // Generate lesson
        console.log("Lesson missing. Auto-generating…");
        const genRes = await fetch("/api/lesson-gen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            topic: "Default topic",
            difficulty: "normal",
            learningStyle: "verbal"
          }),
        });
  
        if (!genRes.ok) throw new Error("Lesson generation failed");
  
        const gen = await genRes.json();
  
        if (isMounted) {
          setLesson(gen.lesson);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    }
  
    fetchLesson();
    return () => { isMounted = false };
  }, [lessonId]);
  

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const element = contentRef.current
        const scrollTop = window.scrollY
        const elementTop = element.offsetTop
        const elementHeight = element.scrollHeight
        const windowHeight = window.innerHeight

        const scrolled = Math.max(
          0,
          Math.min(1, (scrollTop + windowHeight - elementTop) / elementHeight)
        )
        setScrollDepth(scrolled)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Log interaction on unmount
  useEffect(() => {
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000)
      if (lessonId && userId) {
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            lessonId,
            duration,
            scrollDepth,
            openedAt: new Date(startTime).toISOString(),
            closedAt: new Date().toISOString(),
          }),
        }).catch(console.error)
      }
    }
  }, [lessonId, userId, scrollDepth, startTime])

  if (loading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl font-medium text-gray-700 mb-3">
          Tananyag előkészítése…
        </div>
        <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-indigo-600 rounded-full mx-auto"></div>
      </div>
    </div>
  )
}


  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tananyag nem található</h1>
          <Link href="/lessons" className="text-indigo-600 hover:underline">
            Vissza a tananyagokhoz
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/lessons"
          className="text-indigo-600 hover:underline mb-4 inline-block"
        >
          ← Vissza a tananyagokhoz
        </Link>

        <article className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{lesson.title}</h1>

          {lesson.topic && (
            <div className="mb-4">
              <span className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded">
                {lesson.topic}
              </span>
              <span
                className={`ml-2 text-sm px-3 py-1 rounded ${
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
            </div>
          )}

          <div
            ref={contentRef}
            className="prose prose-lg max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed"
          >
            {lesson.content.split('\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4">
                {paragraph || '\u00A0'}
              </p>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Olvasás előrehaladása: {Math.round(scrollDepth * 100)}%
              </div>
              <Link
                href={`/quiz/${lessonId}`}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Kvíz megoldása →
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

