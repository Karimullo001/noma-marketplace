import React from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SellerProductsClient } from "@/components/sotuvchi/seller-products-client";
import type { Product } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerProductsPage() {
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
    .select("*, category:categories(*), brand:brands(*), variants:product_variants(*)")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-primary">Mahsulotlarim</h1>
        <Link
          href="/sotuvchi/mahsulot-qoshish"
          className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" /> Qo&apos;shish
        </Link>
      </div>
      <SellerProductsClient products={(products as Product[]) || []} />
    </div>
  );
}
