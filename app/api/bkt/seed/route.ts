// app/api/bkt/seed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { SKILL_CATALOG } from "@/lib/skills";

export async function POST(req: NextRequest) {
  try {
    const { userId, initialPKnown = 0.2 } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1) Ensure skills exist
    const { error: skillsErr } = await supabase
      .from("skills")
      .upsert(
        SKILL_CATALOG.map((s) => ({ id: s.id, description: s.description })),
        { onConflict: "id" }
      );

    if (skillsErr) {
      return NextResponse.json(
        { error: "Failed to seed skills", details: skillsErr.message },
        { status: 500 }
      );
    }

    // 2) Ensure bkt_states exist for this user
    const { data: existing, error: existingErr } = await supabase
      .from("bkt_states")
      .select("skill_key")
      .eq("user_id", userId);

    if (existingErr) {
      return NextResponse.json(
        { error: "Failed to check bkt_states", details: existingErr.message },
        { status: 500 }
      );
    }

    const existingKeys = new Set((existing || []).map((r: any) => r.skill_key));
    const missing = SKILL_CATALOG.filter((s) => !existingKeys.has(s.id));

    if (missing.length > 0) {
      const rows = missing.map((s) => ({
        user_id: userId,
        skill_key: s.id,
        p_known: initialPKnown,
        // your table defaults cover p_learn/p_guess/p_slip if omitted, but explicit is OK too:
        p_learn: 0.3,
        p_guess: 0.2,
        p_slip: 0.1,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertErr } = await supabase.from("bkt_states").insert(rows);

      if (insertErr) {
        return NextResponse.json(
          { error: "Failed to seed bkt_states", details: insertErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, seeded: missing.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to seed user mastery", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
