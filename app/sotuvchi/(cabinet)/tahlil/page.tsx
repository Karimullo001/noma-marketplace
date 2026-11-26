import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import type { Order, Product } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerAnalyticsPage() {
  const supabase = (await createServerSupabaseClient())!;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("seller_id", user!.id)
    .single();
  if (!store) return null;

  const [{ data: orders }, { data: products }] = await Promise.all([
    supabase.from("orders").select("*").eq("store_id", store.id),
    supabase
      .from("products")
      .select("*, variants:product_variants(*)")
      .eq("store_id", store.id)
      .eq("is_archived", false)
      .order("sales_count", { ascending: false }),
  ]);

  const orderList = (orders as Order[]) || [];
  const productList = (products as Product[]) || [];

  const totalSales = orderList
    .filter((o) => !["cancelled", "rejected"].includes(o.status))
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const completedOrders = orderList.filter((o) => o.status === "delivered").length;
  const pendingOrders = orderList.filter((o) =>
    ["pending", "accepted", "preparing", "ready", "shipped"].includes(o.status)
  ).length;

  const lowStockVariants = productList.flatMap((p) =>
    (p.variants || [])
      .filter((v) => v.stock_quantity <= 3)
      .map((v) => ({ productName: p.name, size: v.size, color: v.color, qty: v.stock_quantity }))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-primary">Sotuv tahlili</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-border">
          <span className="text-xs text-muted-foreground">Jami buyurtmalar</span>
          <div className="text-2xl font-black text-primary mt-1">{orderList.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-border">
          <span className="text-xs text-muted-foreground">Yakunlangan</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{completedOrders}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-border">
          <span className="text-xs text-muted-foreground">Jarayonda</span>
          <div className="text-2xl font-black text-terracotta mt-1">{pendingOrders}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-border">
          <span className="text-xs text-muted-foreground">Umumiy tushum</span>
          <div className="text-xl font-black text-accent mt-1">{formatPrice(totalSales)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-bold text-primary">Eng ko&apos;p sotilgan mahsulotlar</h2>
          {productList.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ma&apos;lumot yo&apos;q.</p>
          ) : (
            <div className="divide-y divide-border text-xs">
              {productList.slice(0, 5).map((p) => (
                <div key={p.id} className="py-2.5 flex justify-between">
                  <span className="font-semibold text-primary truncate max-w-xs">{p.name}</span>
                  <span className="font-bold text-accent">{p.sales_count} ta sotilgan</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-bold text-primary">Kam qolgan o&apos;lchamlar (≤ 3 dona)</h2>
          {lowStockVariants.length === 0 ? (
            <p className="text-xs text-muted-foreground">Hamma mahsulotlar zaxirasi yetarli.</p>
          ) : (
            <div className="divide-y divide-border text-xs">
              {lowStockVariants.slice(0, 8).map((item, idx) => (
                <div key={idx} className="py-2 flex justify-between">
                  <span className="text-primary truncate max-w-xs">
                    {item.productName} ({item.size}, {item.color})
                  </span>
                  <span className={`font-bold ${item.qty === 0 ? "text-rose-600" : "text-amber-700"}`}>
                    {item.qty} dona
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
