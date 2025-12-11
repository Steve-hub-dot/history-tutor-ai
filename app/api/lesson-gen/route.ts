// /app/api/lesson-gen/route.ts

import { NextRequest, NextResponse } from "next/server";
import { generateLesson } from "@/lib/ai";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      difficulty = "normal",
      learningStyle = "verbal",
      userId,
      skillKeys, // opcionális: ha konkrét skillekre akarsz fókuszálni
    } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    /* ---------------------------------------------------------
       1) BKT ALAPÚ GYENGE SKILLEK KIVÁLASZTÁSA
    --------------------------------------------------------- */
    let weakSkills: string[] = [];

    if (userId) {
      // Alap lekérdezés: minden skill ehhez az userhez
      let query = supabase
        .from("bkt_states")
        .select("skill_key, p_known")
        .eq("user_id", userId);

      // Ha csak bizonyos skillek érdekelnek (pl. adott témához kötve)
      if (Array.isArray(skillKeys) && skillKeys.length > 0) {
        query = query.in("skill_key", skillKeys);
      }

      const { data: states, error: statesError } = await query;

      if (statesError) {
        console.error("Error fetching BKT states for lesson-gen:", statesError);
      } else if (states && states.length > 0) {
        // Rendezés mastery szerint (növekvő → leggyengébb elöl)
        const sorted = [...states].sort(
          (a, b) => (a.p_known ?? 0.5) - (b.p_known ?? 0.5)
        );

        // Vedd mondjuk a 1–3 leggyengébb skillt,
        // vagy mindet, amelyik egy küszöb alatt van
        const THRESHOLD = 0.75;

        weakSkills = sorted
          .filter((row) => (row.p_known ?? 0.5) < THRESHOLD)
          .slice(0, 3)
          .map((row) => row.skill_key as string);
      }
    }

    console.log("Lesson-gen weakSkills:", weakSkills);

    /* ---------------------------------------------------------
       2) LESSON GENERÁLÁS (ADAPTÍV / REMEDIAL)
    --------------------------------------------------------- */
    const result = await generateLesson(
      topic,
      difficulty,
      learningStyle,
      weakSkills
    );

    if (!result?.title || !result?.content) {
      return NextResponse.json(
        { error: "AI did not return a valid lesson" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       3) MENTÉS ADATBÁZISBA
    --------------------------------------------------------- */
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        title: result.title,
        content: result.content,
        difficulty,
        topic,
        // opcionálisan: ha van ilyen JSONB / text[] meződ
        // focus_skills: weakSkills,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to save lesson", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        lesson: data,
        weakSkills,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("lesson-gen error:", err);
    return NextResponse.json(
      { error: "Lesson generation failed", details: err.message },
      { status: 500 }
    );
  }
}
