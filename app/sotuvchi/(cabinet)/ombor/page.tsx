import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FastStockClient } from "@/components/sotuvchi/fast-stock-client";
import type { Product } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerOmborPage() {
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

  const { data: products } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("store_id", store.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary">Tezkor ombor boshqaruvi</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Do&apos;koningizdagi har bir o&apos;lcham qoldig&apos;ini 1 ta bosishda yangilang — o&apos;zgarish xaridorlarga darhol ko&apos;rinadi
        </p>
      </div>
      <FastStockClient products={(products as Product[]) || []} />
    </div>
  );
}
