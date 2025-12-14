// app/api/bkt/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { ALLOWED_SKILL_KEYS } from "@/lib/ai";

const SKILL_DESCRIPTIONS: Record<string, string> = {
  historical_knowledge: "Recall of key facts, dates, people, events",
  historical_analysis: "Cause-effect, comparison, interpretation",
  historical_understanding: "Conceptual understanding of the topic",
  critical_thinking: "Reasoning, evaluation, inference",
  source_evaluation: "Primary/secondary source reasoning",
  chronology: "Sequencing and timelines",
  general: "Fallback skill key",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, pKnown = 0.2 } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1) Ensure skills exist
    const skillRows = ALLOWED_SKILL_KEYS.map((id) => ({
      id,
      description: SKILL_DESCRIPTIONS[id] || null,
    }));

    const insSkills = await supabase.from("skills").upsert(skillRows, {
      onConflict: "id",
    });

    if (insSkills.error) {
      return NextResponse.json(
        { error: "Failed to seed skills", details: insSkills.error.message },
        { status: 500 }
      );
    }

    // 2) Ensure bkt_states exist for user
    const stateRows = ALLOWED_SKILL_KEYS.map((skill_key) => ({
      user_id: userId,
      skill_key,
      p_known: pKnown,
      p_learn: 0.3,
      p_guess: 0.2,
      p_slip: 0.1,
      updated_at: new Date().toISOString(),
    }));

    const upStates = await supabase.from("bkt_states").upsert(stateRows, {
      onConflict: "user_id,skill_key",
    });

    if (upStates.error) {
      return NextResponse.json(
        { error: "Failed to seed bkt_states", details: upStates.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, seededSkills: ALLOWED_SKILL_KEYS });
  } catch (err) {
    return NextResponse.json(
      { error: "Bootstrap failed", details: `${err}` },
      { status: 500 }
    );
  }
}
