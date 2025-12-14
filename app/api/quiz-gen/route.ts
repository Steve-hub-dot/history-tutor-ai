// app/api/quiz-gen/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateQuiz, ALLOWED_SKILL_KEYS } from "@/lib/ai";
import { createServerClient } from "@/lib/supabase";

function sanitizeSkillKey(skillKey: any): string {
  const s = String(skillKey || "");
  if (ALLOWED_SKILL_KEYS.includes(s as any)) return s;
  return "general";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, lessonId, difficulty, learningStyle, numQuestions } = body;

    if (!userId || !lessonId) {
      return NextResponse.json(
        { error: "userId and lessonId required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 0) Bootstrap user mastery baseline (skills + base bkt_states)
    //    (If already seeded, this is harmless.)
    const origin =
      request.headers.get("origin") ||
      process.env.BASE_URL ||
      "http://localhost:3000";

    await fetch(`${origin}/api/bkt/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, pKnown: 0.2 }),
    }).catch(() => null);

    // 1) Fetch mastery map (now should exist)
    const masteryRes = await fetch(`${origin}/api/bkt/mastery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, skillKeys: [] }),
    });

    let masteryMap: Record<string, number> = {};
    if (masteryRes.ok) {
      const masteryJson = await masteryRes.json();
      masteryMap = masteryJson.skills || {};
    }

    // 2) Weakest first
    const weakSkills = Object.entries(masteryMap)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([k]) => k);

    // 3) Lesson content
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("content, difficulty")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found", details: lessonError?.message },
        { status: 404 }
      );
    }

    // 4) Generate quiz
    const quiz = await generateQuiz(
      lesson.content,
      difficulty || lesson.difficulty || "normal",
      learningStyle || "verbal",
      numQuestions || 5,
      weakSkills
    );

    // 5) SANITIZE skill_key to your taxonomy
    const sanitizedQuestions = quiz.questions.map((q) => ({
      ...q,
      skill_key: sanitizeSkillKey((q as any).skill_key),
    }));

    // 6) Save quiz
    const { data: savedQuiz, error: saveErr } = await supabase
      .from("quizzes")
      .insert({
        lesson_id: lessonId,
        questions: sanitizedQuestions,
      })
      .select()
      .single();

    if (saveErr) {
      console.warn("Warning: quiz not saved:", saveErr.message);
    }

    return NextResponse.json({
      quiz: savedQuiz || { id: "temp", questions: sanitizedQuestions },
      weakSkills,
      questions: sanitizedQuestions,
    });
  } catch (err) {
    console.error("quiz-gen ERROR:", err);
    return NextResponse.json(
      { error: "Quiz generation failed", details: `${err}` },
      { status: 500 }
    );
  }
}
