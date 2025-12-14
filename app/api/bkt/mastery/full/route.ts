// app/api/bkt/mastery/full/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("bkt_states")
      .select("skill_key, p_known, skills(description)")
      .eq("user_id", userId)
      .order("skill_key", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    const rows =
      (data || []).map((r: any) => ({
        skill_key: r.skill_key,
        p_known: r.p_known,
        description: r.skills?.description ?? null,
      })) || [];

    return NextResponse.json({ skills: rows });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch mastery", details: `${err}` },
      { status: 500 }
    );
  }
}
