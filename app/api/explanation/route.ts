import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { generateExplanation } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, lessonId, learningStyle = "verbal", difficulty = "normal" } = body;

    if (!userId || !lessonId) {
      return NextResponse.json(
        { error: "userId and lessonId required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    /* ---------------------------------------------------------
       1) FETCH LESSON CONTENT
    --------------------------------------------------------- */
    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .select("content")
      .eq("id", lessonId)
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json(
        { error: "Lesson not found", details: lessonErr?.message },
        { status: 404 }
      );
    }

    /* ---------------------------------------------------------
       2) FETCH WEAK SKILLS FROM BKT
    --------------------------------------------------------- */
    const { data: states } = await supabase
      .from("bkt_states")
      .select("skill_key, p_known")
      .eq("user_id", userId);

    const weakSkills =
      states
        ?.sort((a, b) => a.p_known - b.p_known)
        .slice(0, 3)
        .map((x) => x.skill_key) || [];

    /* ---------------------------------------------------------
       3) GENERATE EXPLANATION
    --------------------------------------------------------- */
    const explanation = await generateExplanation(
      lesson.content,
      weakSkills,
      learningStyle,
      difficulty
    );

    return NextResponse.json(
      { explanation, weakSkills },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("explanation error:", err);
    return NextResponse.json(
      { error: "Failed to generate explanation", details: err.message },
      { status: 500 }
    );
  }
}
