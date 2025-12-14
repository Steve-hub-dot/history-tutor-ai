// app/lesson/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Lesson {
  id: string;
  title: string;
  content: string;
  difficulty: string;
  topic: string | null;
}

type MasteryRow = { skill_key: string; p_known: number; description?: string | null };

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  // demo user
  const [userId] = useState("00000000-0000-0000-0000-000000000001");

  const [scrollDepth, setScrollDepth] = useState(0);
  const [startTime] = useState(Date.now());
  const contentRef = useRef<HTMLDivElement>(null);

  // Explanation UI
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  // Mastery UI
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [loadingMastery, setLoadingMastery] = useState(false);
  const [showMastery, setShowMastery] = useState(false);

  /* --------------------------------------------------------------
     FETCH LESSON (OR AUTO-GENERATE IF MISSING)
  -------------------------------------------------------------- */
  useEffect(() => {
    let isMounted = true;

    async function fetchLesson() {
      try {
        const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).single();

        if (data) {
          if (isMounted) {
            setLesson(data);
            setLoading(false);
          }
          return;
        }

        // Auto-generate if missing
        const genRes = await fetch("/api/lesson-gen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: "Default topic", difficulty: "normal", learningStyle: "verbal" }),
        });

        if (!genRes.ok) throw new Error("Lesson generation failed");
        const gen = await genRes.json();

        if (isMounted) {
          setLesson(gen.lesson);
          setLoading(false);
        }
      } catch (err) {
        console.error("Lesson fetch error:", err);
        if (isMounted) setLoading(false);
      }
    }

    fetchLesson();
    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  /* --------------------------------------------------------------
     SCROLL DEPTH TRACKING
  -------------------------------------------------------------- */
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const element = contentRef.current;
      const scrollTop = window.scrollY;
      const elementTop = element.offsetTop;
      const elementHeight = element.scrollHeight;
      const windowHeight = window.innerHeight;

      const scrolled = Math.max(0, Math.min(1, (scrollTop + windowHeight - elementTop) / elementHeight));
      setScrollDepth(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* --------------------------------------------------------------
     LOG TIME + SCROLL DEPTH ON UNMOUNT
  -------------------------------------------------------------- */
  useEffect(() => {
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);

      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          lessonId,
          duration,
          scrollDepth,
          openedAt: new Date(startTime).toISOString(),
          closedAt: new Date().toISOString(),
        }),
      }).catch(console.error);
    };
  }, [lessonId, userId, scrollDepth, startTime]);

  /* --------------------------------------------------------------
     SEED + LOAD MASTERY
  -------------------------------------------------------------- */
  useEffect(() => {
    if (!userId) return;

    async function seedAndLoad() {
      setLoadingMastery(true);
      try {
        // 1) seed (safe to call repeatedly)
        await fetch("/api/bkt/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, initialPKnown: 0.2 }),
        });

        // 2) load mastery
        const res = await fetch("/api/bkt/mastery/full", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to load mastery (HTTP ${res.status})`);
        }

        const data = await res.json();
        setMastery(data.skills || []);
      } catch (err) {
        console.error("Mastery load error:", err);
        setMastery([]);
      } finally {
        setLoadingMastery(false);
      }
    }

    seedAndLoad();
  }, [userId]);

  /* --------------------------------------------------------------
     EXPLANATION
  -------------------------------------------------------------- */
  const handleExplainWeakParts = async () => {
    setLoadingExplanation(true);
    setExplanation(null);
    setExplanationError(null);

    try {
      const response = await fetch("/api/explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          lessonId,
          learningStyle: "verbal",
          difficulty: lesson?.difficulty || "normal",
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to generate explanation (HTTP ${response.status})`);
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err: any) {
      console.error("Explanation error:", err);
      setExplanationError(err?.message || "Ismeretlen hiba történt.");
    } finally {
      setLoadingExplanation(false);
    }
  };

  /* --------------------------------------------------------------
     UI STATES
  -------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-medium text-gray-700 mb-3">Tananyag előkészítése…</div>
          <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-indigo-600 rounded-full mx-auto" />
        </div>
      </div>
    );
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
    );
  }

  /* --------------------------------------------------------------
     MAIN RENDER
  -------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/lessons" className="text-indigo-600 hover:underline mb-4 inline-block">
          ← Vissza a tananyagokhoz
        </Link>

        <article className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{lesson.title}</h1>

          {lesson.topic && (
            <div className="mb-4 flex items-center gap-3">
              <span className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded">{lesson.topic}</span>
              <span
                className={`text-sm px-3 py-1 rounded ${
                  lesson.difficulty === "easy"
                    ? "bg-green-100 text-green-800"
                    : lesson.difficulty === "hard"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {lesson.difficulty === "easy" ? "Könnyű" : lesson.difficulty === "hard" ? "Nehéz" : "Közepes"}
              </span>
            </div>
          )}

          {/* Mastery toggle */}
          <button
            onClick={() => setShowMastery((s) => !s)}
            className="mb-3 bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition"
          >
            {showMastery ? "BKT-mesterszint elrejtése" : "BKT-mesterszint megjelenítése"}
          </button>

          {showMastery && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-3">Tanulói mesterszint (BKT alapján)</h3>

              {loadingMastery && <p className="text-gray-500 text-sm">Betöltés…</p>}

              {!loadingMastery && mastery.length === 0 && (
                <p className="text-gray-500 text-sm">Még nincs elég adat a mesterszint meghatározásához.</p>
              )}

              {!loadingMastery &&
                mastery.map((m) => (
                  <div key={m.skill_key} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">
                        {m.skill_key}
                        {m.description ? <span className="text-gray-500"> — {m.description}</span> : null}
                      </span>
                      <span>{Math.round(m.p_known * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-indigo-600 rounded" style={{ width: `${m.p_known * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Explanation button */}
          <button
            onClick={handleExplainWeakParts}
            disabled={loadingExplanation}
            className="mb-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
          >
            Magyarázd újra a gyenge részeket
          </button>

          {loadingExplanation && <p className="text-sm text-gray-500 mb-2">Magyarázat készítése...</p>}
          {explanationError && <p className="text-sm text-red-600 mb-2">{explanationError}</p>}

          {/* Lesson content */}
          <div
            ref={contentRef}
            className="prose prose-lg max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed mt-4"
          >
            {lesson.content.split("\n").map((p, i) => (
              <p key={i} className="mb-4">
                {p || "\u00A0"}
              </p>
            ))}
          </div>

          {/* Explanation output */}
          {explanation && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Újramagyarázva a gyenge részek alapján:</h3>
              <p className="whitespace-pre-line text-gray-700">{explanation}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">Olvasás előrehaladása: {Math.round(scrollDepth * 100)}%</div>
            <Link
              href={`/quiz/${lessonId}`}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Kvíz megoldása →
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
