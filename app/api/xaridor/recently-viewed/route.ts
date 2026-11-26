import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const viewSchema = z.object({ product_id: z.string().uuid() });

export async function POST(request: Request) {
  const guard = await requireRole(["customer"]);
  if (!guard.ok) return NextResponse.json({ ok: false });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false });
  }

  const parsed = viewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false });

  const supabase = await createServerSupabaseClient();
  await supabase!.from("recently_viewed").upsert(
    {
      user_id: guard.ctx.userId,
      product_id: parsed.data.product_id,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_id" }
  );

  return NextResponse.json({ ok: true });
}
