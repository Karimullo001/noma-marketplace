import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FREE_TRIALS_LIMIT = 5;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    let userId: string | null = null;
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({
        ok: true,
        requireAuth: true,
        usedCount: 0,
        freeLimit: FREE_TRIALS_LIMIT,
        remainingTrials: FREE_TRIALS_LIMIT,
      });
    }

    let usedCount = 0;
    if (admin) {
      const trackerId = `user:${userId}`;
      const { count } = await admin
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "ai_look_generated")
        .eq("details->>tracker_id", trackerId);

      usedCount = count || 0;
    }

    const remainingTrials = Math.max(0, FREE_TRIALS_LIMIT - usedCount);

    return NextResponse.json({
      ok: true,
      requireAuth: false,
      usedCount,
      freeLimit: FREE_TRIALS_LIMIT,
      remainingTrials,
    });
  } catch (err: unknown) {
    console.error("[AI Look Usage] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server xatoligi" },
      { status: 500 }
    );
  }
}
