import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai";
import { createServerClient } from "@/lib/supabase";

interface SkillMasteryMap {
  [skill: string]: number;
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

    /* ---------------------------------------------------------
       1) BUILD ABSOLUTE URL (SSR fetch requires it!)
    --------------------------------------------------------- */
    const origin =
      request.headers.get("origin") ||
      process.env.BASE_URL ||
      "http://localhost:3000";

    /* ---------------------------------------------------------
       2) FETCH MASTERY FROM BKT ENDPOINT
    --------------------------------------------------------- */
    const masteryRes = await fetch(`${origin}/api/bkt/mastery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, skillKeys: [] }),
    });

    let mastery: { skills: SkillMasteryMap } = { skills: {} };

    if (masteryRes.ok) {
      mastery = await masteryRes.json();
    } else {
      console.warn("Could not fetch mastery → using empty map");
    }

    const masteryMap = mastery.skills || {};

    /* ---------------------------------------------------------
       3) SORT SKILLS ASCENDING → weakest first
    --------------------------------------------------------- */
    const sortedWeaknesses = Object.entries(masteryMap)
      .sort((a, b) => a[1] - b[1])
      .map(([skill]) => skill);

    const weakSkills = sortedWeaknesses.slice(0, 3);

    console.log("Weakest skills:", weakSkills);

    /* ---------------------------------------------------------
       4) FETCH LESSON CONTENT
    --------------------------------------------------------- */
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

    /* ---------------------------------------------------------
       5) GENERATE QUIZ (ADAPTIVE)
    --------------------------------------------------------- */
    const quiz = await generateQuiz(
      lesson.content,
      difficulty || lesson.difficulty || "normal",
      learningStyle || "verbal",
      numQuestions || 5,
      weakSkills
    );

    /* ---------------------------------------------------------
       6) SAVE QUIZ
    --------------------------------------------------------- */
    const { data: savedQuiz, error: saveErr } = await supabase
      .from("quizzes")
      .insert({
        lesson_id: lessonId,
        questions: quiz.questions,
      })
      .select()
      .single();

    if (saveErr) {
      console.warn("Warning: quiz not saved:", saveErr);
    }

    /* ---------------------------------------------------------
       7) RETURN FINAL RESPONSE
    --------------------------------------------------------- */
    return NextResponse.json({
      quiz: savedQuiz || { id: "temp", questions: quiz.questions },
      weakSkills,
      questions: quiz.questions,
    });
  } catch (err) {
    console.error("quiz-gen ERROR:", err);
    return NextResponse.json(
      { error: "Quiz generation failed", details: `${err}` },
      { status: 500 }
    );
  }
}
