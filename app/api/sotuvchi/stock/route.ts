import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fastStockUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request) {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;
  if (!guard.ctx.store) return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = fastStockUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Miqdor noto'g'ri" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: variant } = await supabase!
    .from("product_variants")
    .select("id, product:products!inner(store_id)")
    .eq("id", parsed.data.variant_id)
    .eq("product.store_id", guard.ctx.store.id)
    .maybeSingle();

  if (!variant) {
    return NextResponse.json({ error: "Variant topilmadi yoki sizga tegishli emas" }, { status: 404 });
  }

  const { data, error } = await supabase!
    .from("product_variants")
    .update({ stock_quantity: parsed.data.stock_quantity })
    .eq("id", parsed.data.variant_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Trigger low stock check
  import("@/lib/telegram/events").then(({ notifySellerLowStock }) => {
    notifySellerLowStock(parsed.data.variant_id).catch((err) => {
      console.error("[Stock API] Failed to check low stock alert:", err);
    });
  });

  return NextResponse.json({ variant: data });
}
