import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("bkt_states")
      .select("skill_id, p_known")
      .eq("user_id", userId);

    if (error) {
      console.warn("BKT fetch error:", error);
      return NextResponse.json({});
    }

    // Convert to map
    const mastery: Record<string, number> = {};
    data?.forEach((row) => {
      mastery[row.skill_id] = row.p_known;
    });

    return NextResponse.json(mastery);
  } catch (err) {
    console.warn("BKT mastery unexpected error:", err);
    return NextResponse.json({});
  }
}
