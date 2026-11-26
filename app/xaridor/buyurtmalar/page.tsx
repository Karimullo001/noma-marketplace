import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OrdersClient } from "@/components/xaridor/orders-client";
import { RealtimeRefresh } from "@/components/shared/realtime-listener";
import type { Order } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function XaridorOrdersPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/xaridor/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/xaridor/kirish?next=/xaridor/buyurtmalar");

  const [{ data: orders }, { data: reviews }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, store:stores(*), items:order_items(*), delivery:deliveries(*)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("order_id, product_id").eq("customer_id", user.id),
  ]);

  const reviewedPairs = (reviews || []).map((r) => `${r.order_id}:${r.product_id}`);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <RealtimeRefresh
        channelName={`customer-orders-${user.id}`}
        subscriptions={[{ table: "orders", filter: `customer_id=eq.${user.id}` }]}
      />
      <div>
        <h1 className="text-2xl font-black text-primary">Mening buyurtmalarim</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Buyurtmalar holati sotuvchi yangilaganda avtomatik yangilanadi
        </p>
      </div>
      <OrdersClient orders={(orders as Order[]) || []} reviewedPairs={reviewedPairs} />
    </div>
  );
}
