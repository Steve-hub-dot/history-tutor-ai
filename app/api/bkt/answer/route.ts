import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { ALLOWED_SKILL_KEYS } from "@/lib/ai";

const BKT_SERVER_URL = process.env.BKT_SERVER_URL || "http://localhost:8000";

// Baseline values used if the user/skill has no row yet (should be rare if you bootstrap)
const DEFAULT_STATE = {
  p_known: 0.2,
  p_learn: 0.3,
  p_guess: 0.2,
  p_slip: 0.1,
};

function sanitizeSkillKey(skillKey: unknown): string {
  const s = String(skillKey || "");
  return ALLOWED_SKILL_KEYS.includes(s as any) ? s : "general";
}

function bktUpdate(params: {
  p_known: number;
  p_learn: number;
  p_guess: number;
  p_slip: number;
  correct: boolean;
}) {
  const { p_known, p_learn, p_guess, p_slip, correct } = params;

  // Guardrails
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const pk = clamp(p_known);
  const pl = clamp(p_learn);
  const pg = clamp(p_guess);
  const ps = clamp(p_slip);

  // Posterior given observation
  let posterior: number;

  if (correct) {
    const num = pk * (1 - ps);
    const den = num + (1 - pk) * pg;
    posterior = den === 0 ? pk : num / den;
  } else {
    const num = pk * ps;
    const den = num + (1 - pk) * (1 - pg);
    posterior = den === 0 ? pk : num / den;
  }

  // Learning transition
  const p_new = posterior + (1 - posterior) * pl;

  return {
    p_prior: pk,
    p_posterior: posterior,
    p_new: clamp(p_new),
    p_learn: pl,
    p_guess: pg,
    p_slip: ps,
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, ms = 1500) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, skillKey, correct, lessonId, questionId } = body;

    if (!userId || !skillKey || typeof correct !== "boolean") {
      return NextResponse.json(
        { error: "userId, skillKey, and correct(boolean) are required" },
        { status: 400 }
      );
    }

    const safeSkillKey = sanitizeSkillKey(skillKey);
    const supabase = createServerClient();

    // Ensure skill exists (FK safety)
    const upSkill = await supabase
      .from("skills")
      .upsert({ id: safeSkillKey, description: null }, { onConflict: "id" });

    if (upSkill.error) {
      return NextResponse.json(
        { error: "Failed to ensure skill exists", details: upSkill.error.message },
        { status: 500 }
      );
    }

    // Load existing state (or baseline)
    const { data: existing, error: readErr } = await supabase
      .from("bkt_states")
      .select("p_known,p_learn,p_guess,p_slip")
      .eq("user_id", userId)
      .eq("skill_key", safeSkillKey)
      .maybeSingle();

    if (readErr) {
      return NextResponse.json(
        { error: "Failed to read current BKT state", details: readErr.message },
        { status: 500 }
      );
    }

    const prior = {
      p_known: existing?.p_known ?? DEFAULT_STATE.p_known,
      p_learn: existing?.p_learn ?? DEFAULT_STATE.p_learn,
      p_guess: existing?.p_guess ?? DEFAULT_STATE.p_guess,
      p_slip: existing?.p_slip ?? DEFAULT_STATE.p_slip,
    };

    // 1) TRY Python BKT server first
    let bktResult:
      | { p_new: number; p_learn: number; p_guess: number; p_slip: number; source: "python" | "local" }
      | null = null;

    try {
      const bktResponse = await fetchWithTimeout(
        `${BKT_SERVER_URL}/bkt/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            skill_key: safeSkillKey,
            correct,
            lesson_id: lessonId,
            question_id: questionId,
          }),
        },
        1500
      );

      if (bktResponse.ok) {
        const json = await bktResponse.json();
        // Expecting python returns at least p_new, p_learn, p_guess, p_slip
        bktResult = {
          p_new: Number(json.p_new),
          p_learn: Number(json.p_learn ?? prior.p_learn),
          p_guess: Number(json.p_guess ?? prior.p_guess),
          p_slip: Number(json.p_slip ?? prior.p_slip),
          source: "python",
        };
      }
    } catch {
      // ignore → fallback to local
    }

    // 2) FALLBACK: local BKT update
    if (!bktResult || !Number.isFinite(bktResult.p_new)) {
      const local = bktUpdate({
        ...prior,
        correct,
      });

      bktResult = {
        p_new: local.p_new,
        p_learn: local.p_learn,
        p_guess: local.p_guess,
        p_slip: local.p_slip,
        source: "local",
      };
    }

    // Upsert updated state
    const up = await supabase.from("bkt_states").upsert(
      {
        user_id: userId,
        skill_key: safeSkillKey,
        p_known: bktResult.p_new,
        p_learn: bktResult.p_learn,
        p_guess: bktResult.p_guess,
        p_slip: bktResult.p_slip,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,skill_key" }
    );

    if (up.error) {
      return NextResponse.json(
        { error: "Failed to upsert bkt_state", details: up.error.message },
        { status: 500 }
      );
    }

    // Return in the shape your UI already expects
    return NextResponse.json({
      p_new: bktResult.p_new,
      p_learn: bktResult.p_learn,
      p_guess: bktResult.p_guess,
      p_slip: bktResult.p_slip,
      skill_key: safeSkillKey,
      correct,
      source: bktResult.source,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to process BKT answer", details: `${err}` },
      { status: 500 }
    );
  }
}
