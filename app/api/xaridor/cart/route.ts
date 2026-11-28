import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cartAddSchema, cartUpdateSchema } from "@/lib/validation/schemas";

export async function GET() {
  const guard = await requireRole(["customer", "seller", "admin"]);
  if (!guard.ok) return guard.response;

  const supabase = await createServerSupabaseClient();
  const { data: cart } = await supabase!
    .from("carts")
    .select("id")
    .eq("user_id", guard.ctx.userId)
    .maybeSingle();

  if (!cart) return NextResponse.json({ items: [] });

  const { data: items, error } = await supabase!
    .from("cart_items")
    .select(`
      id, cart_id, product_id, variant_id, quantity,
      product:products(*, store:stores(*)),
      variant:product_variants(*)
    `)
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: items ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireRole(["customer", "seller", "admin"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = cartAddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Mahsulot ma'lumotlari noto'g'ri" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify variant is active & has enough stock
  const { data: variant } = await supabase!
    .from("product_variants")
    .select("id, stock_quantity, product:products!inner(id, is_active, is_archived, store:stores!inner(status))")
    .eq("id", parsed.data.variant_id)
    .eq("product_id", parsed.data.product_id)
    .maybeSingle();

  if (!variant) {
    return NextResponse.json({ error: "Tanlangan variant topilmadi" }, { status: 404 });
  }

  if (variant.stock_quantity < parsed.data.quantity) {
    return NextResponse.json(
      { error: `Omborda yetarli mahsulot yo'q. Mavjud: ${variant.stock_quantity} dona.` },
      { status: 400 }
    );
  }

  let { data: cart } = await supabase!
    .from("carts")
    .select("id")
    .eq("user_id", guard.ctx.userId)
    .maybeSingle();

  if (!cart) {
    const { data: createdCart, error: cartErr } = await supabase!
      .from("carts")
      .insert({ user_id: guard.ctx.userId })
      .select("id")
      .single();
    if (cartErr || !createdCart) {
      return NextResponse.json({ error: "Savat yaratib bo'lmadi" }, { status: 500 });
    }
    cart = createdCart;
  }

  const { data: existingItem } = await supabase!
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("variant_id", parsed.data.variant_id)
    .maybeSingle();

  const nextQty = (existingItem?.quantity || 0) + parsed.data.quantity;
  if (nextQty > variant.stock_quantity) {
    return NextResponse.json(
      { error: `Ombordagi mavjud miqdordan (${variant.stock_quantity} dona) ortiq qo'shib bo'lmaydi.` },
      { status: 400 }
    );
  }

  if (existingItem) {
    await supabase!
      .from("cart_items")
      .update({ quantity: nextQty })
      .eq("id", existingItem.id);
  } else {
    await supabase!.from("cart_items").insert({
      cart_id: cart.id,
      product_id: parsed.data.product_id,
      variant_id: parsed.data.variant_id,
      quantity: nextQty,
    });
  }

  return NextResponse.json({ success: true, message: "Mahsulot savatga qo'shildi" });
}

export async function PATCH(request: Request) {
  const guard = await requireRole(["customer", "seller", "admin"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = cartUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Miqdor noto'g'ri" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (parsed.data.quantity === 0) {
    await supabase!.from("cart_items").delete().eq("id", parsed.data.item_id);
    return NextResponse.json({ success: true });
  }

  const { data: item } = await supabase!
    .from("cart_items")
    .select("id, variant:product_variants(stock_quantity)")
    .eq("id", parsed.data.item_id)
    .maybeSingle();

  const stock = (item?.variant as unknown as { stock_quantity: number } | null)?.stock_quantity ?? 0;
  if (!item || parsed.data.quantity > stock) {
    return NextResponse.json(
      { error: `Omborda faqat ${stock} dona mavjud.` },
      { status: 400 }
    );
  }

  await supabase!
    .from("cart_items")
    .update({ quantity: parsed.data.quantity })
    .eq("id", parsed.data.item_id);

  return NextResponse.json({ success: true });
}
