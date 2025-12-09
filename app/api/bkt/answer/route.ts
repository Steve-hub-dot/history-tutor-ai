import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/*
   SIMPLE BKT MODEL:
   p(L) = probability student knows the skill
   correct = boolean
*/

const P_SLIP = 0.1;
const P_GUESS = 0.2;
const P_TRANSIT = 0.15;

export async function POST(req: NextRequest) {
  try {
    const { userId, skillKey, correct } = await req.json();

    if (!userId || !skillKey) {
      return NextResponse.json(
        { error: "userId and skillKey required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch existing
    const { data: existing } = await supabase
      .from("bkt_states")
      .select("*")
      .eq("user_id", userId)
      .eq("skill_key", skillKey)
      .single();

    let p_prior = existing?.p_known ?? 0.2;

    // Bayesian update
    let p_correct = correct
      ? (p_prior * (1 - P_SLIP)) /
        (p_prior * (1 - P_SLIP) + (1 - p_prior) * P_GUESS)
      : (p_prior * P_SLIP) /
        (p_prior * P_SLIP + (1 - p_prior) * (1 - P_GUESS));

    const p_new = p_correct + (1 - p_correct) * P_TRANSIT;

    // Save
    await supabase
      .from("bkt_states")
      .upsert(
        {
          user_id: userId,
          skill_key: skillKey,
          p_known: p_new,
        },
        { onConflict: "user_id, skill_key" }
      );

    return NextResponse.json({ p_new });
  } catch (err) {
    console.error("BKT update error:", err);
    return NextResponse.json({ p_new: 0.2 }); // safe fallback
  }
}
