import React from "react";
import Link from "next/link";
import { Bell, PlusCircle, ShoppingBag, Package, TrendingUp, Clock } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTashkent, formatPrice, ORDER_STATUS_UZ } from "@/lib/utils";
import type { NotificationItem, Order } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const supabase = (await createServerSupabaseClient())!;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("seller_id", user!.id)
    .single();

  const [{ data: orders }, { count: productsCount }, { data: notifications }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("is_archived", false),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const orderList = (orders as Order[]) || [];
  const totalSales = orderList
    .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const pendingCount = orderList.filter((o) =>
    ["pending", "accepted", "preparing", "ready", "shipped"].includes(o.status)
  ).length;
  const completedCount = orderList.filter((o) => o.status === "delivered").length;
  const notifList = (notifications as NotificationItem[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary">Boshqaruv paneli</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {store.name} — real vaqtdagi ko&apos;rsatkichlar
          </p>
        </div>
        <Link
          href="/sotuvchi/mahsulot-qoshish"
          className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-700 text-white text-xs font-bold inline-flex items-center gap-2 transition"
        >
          <PlusCircle className="w-4 h-4" /> Yangi mahsulot
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami savdo" value={formatPrice(totalSales)} icon={<TrendingUp className="w-4 h-4 text-accent" />} />
        <StatCard label="Jami buyurtmalar" value={`${orderList.length} ta`} sub={`Yetkazilgan: ${completedCount}`} icon={<ShoppingBag className="w-4 h-4 text-primary" />} />
        <StatCard label="Jarayondagi buyurtmalar" value={`${pendingCount} ta`} icon={<Clock className="w-4 h-4 text-terracotta" />} />
        <StatCard label="Faol mahsulotlar" value={`${productsCount ?? 0} ta`} icon={<Package className="w-4 h-4 text-accent" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">So&apos;nggi buyurtmalar</h2>
            <Link href="/sotuvchi/buyurtmalar" className="text-xs font-semibold text-accent hover:underline">
              Barchasi &rarr;
            </Link>
          </div>
          {orderList.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Hozircha buyurtmalar yo&apos;q.</p>
          ) : (
            <div className="divide-y divide-border text-xs">
              {orderList.slice(0, 5).map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-primary">{o.order_number}</span>
                    <span className="text-muted-foreground block">
                      {o.customer_name} • {formatDateTashkent(o.created_at)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary block">{formatPrice(o.total_amount)}</span>
                    <span className="text-[11px] text-accent font-semibold">
                      {ORDER_STATUS_UZ[o.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-bold text-primary inline-flex items-center gap-2">
            <Bell className="w-4 h-4 text-terracotta" /> Bildirishnomalar
          </h2>
          {notifList.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Yangi xabarlar yo&apos;q.</p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {notifList.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-muted/50 border border-border space-y-0.5">
                  <div className="font-bold text-primary">{n.title}</div>
                  <div className="text-muted-foreground">{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-border space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-lg sm:text-xl font-black text-primary">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
