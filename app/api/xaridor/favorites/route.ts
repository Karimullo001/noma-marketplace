import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const favSchema = z.object({ product_id: z.string().uuid() });

export async function GET() {
  const guard = await requireRole(["customer"]);
  if (!guard.ok) return guard.response;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase!
    .from("favorites")
    .select("id, product_id, product:products(*, store:stores(*), brand:brands(*), variants:product_variants(*))")
    .eq("user_id", guard.ctx.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ favorites: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireRole(["customer"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = favSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Mahsulot ID noto'g'ri" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase!
    .from("favorites")
    .select("id")
    .eq("user_id", guard.ctx.userId)
    .eq("product_id", parsed.data.product_id)
    .maybeSingle();

  if (existing) {
    await supabase!.from("favorites").delete().eq("id", existing.id);
    return NextResponse.json({ favorited: false });
  }

  await supabase!.from("favorites").insert({
    user_id: guard.ctx.userId,
    product_id: parsed.data.product_id,
  });
  return NextResponse.json({ favorited: true });
}
