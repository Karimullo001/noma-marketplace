import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });
  }

  const store = guard.ctx.store;

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("display_order");

  if (!store) {
    return NextResponse.json({
      store: null,
      categories: categories || [],
      products: [],
      orders: [],
      stats: { totalOrders: 0, pendingOrders: 0, totalRevenue: 0, activeProducts: 0, lowStockCount: 0 },
    });
  }

  const [prodRes, orderRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, base_price, discount_price, images, is_active, is_archived, created_at, variants:product_variants(id, size, color, stock_quantity)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, order_number, status, total_amount, customer_name, customer_phone, delivery_address, notes, created_at, items:order_items(id, product_name, size, color, quantity, unit_price)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const products = prodRes.data || [];
  const orders = orderRes.data || [];

  let lowStockCount = 0;
  for (const p of products) {
    const vars = (p.variants as { stock_quantity: number }[]) || [];
    if (vars.some((v) => v.stock_quantity <= 2)) lowStockCount++;
  }

  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const pendingOrders = orders.filter((o) => o.status === "new" || o.status === "pending").length;

  return NextResponse.json({
    store,
    categories: categories || [],
    products,
    orders,
    stats: {
      totalOrders: orders.length,
      pendingOrders,
      totalRevenue,
      activeProducts: products.filter((p) => p.is_active && !p.is_archived).length,
      lowStockCount,
    },
  });
}
