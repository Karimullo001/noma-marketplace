import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reviewCreateSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const guard = await requireRole(["customer", "seller", "admin"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = reviewCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Sharh ma'lumotlari noto'g'ri" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: order } = await supabase!
    .from("orders")
    .select("id, store_id, status")
    .eq("id", parsed.data.order_id)
    .eq("customer_id", guard.ctx.userId)
    .maybeSingle();

  if (!order || order.status !== "delivered") {
    return NextResponse.json(
      { error: "Sharh qoldirish uchun buyurtma yetkazib berilgan bo'lishi kerak." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase!
    .from("reviews")
    .insert({
      product_id: parsed.data.product_id,
      store_id: order.store_id,
      order_id: order.id,
      customer_id: guard.ctx.userId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ review: data }, { status: 201 });
}
