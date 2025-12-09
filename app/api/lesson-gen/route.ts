// /app/api/lesson-gen/route.ts

import { NextRequest, NextResponse } from "next/server";
import { generateLesson } from "@/lib/ai";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, difficulty = "normal", learningStyle = "verbal" } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Generate lesson via AI
    const result = await generateLesson(topic, difficulty, learningStyle);

    if (!result?.title || !result?.content) {
      return NextResponse.json(
        { error: "AI did not return a valid lesson" },
        { status: 500 }
      );
    }

    // Save to DB
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        title: result.title,
        content: result.content,
        difficulty,
        topic,
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

    return NextResponse.json({ lesson: data }, { status: 200 });

  } catch (err: any) {
    console.error("lesson-gen error:", err);
    return NextResponse.json(
      { error: "Lesson generation failed", details: err.message },
      { status: 500 }
    );
  }
}
