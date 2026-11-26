import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SellerOrdersClient } from "@/components/sotuvchi/seller-orders-client";
import type { Order } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerOrdersPage() {
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

  const { data: orders } = await supabase
    .from("orders")
    .select("*, items:order_items(*), delivery:deliveries(*)")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary">Buyurtmalar</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Buyurtmalarni qabul qiling, yetkazib berish ma&apos;lumotlarini kiriting (rad etilgan/bekor qilingan buyurtmalarda qoldiq avtomatik tiklanadi)
        </p>
      </div>
      <SellerOrdersClient orders={(orders as Order[]) || []} />
    </div>
  );
}
