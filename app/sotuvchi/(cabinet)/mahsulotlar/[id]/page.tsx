import React from "react";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductFormClient } from "@/components/sotuvchi/product-form-client";
import type { Category, Product } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = (await createServerSupabaseClient())!;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("seller_id", user!.id)
    .single();
  if (!store) notFound();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, brand:brands(*), variants:product_variants(*)")
      .eq("id", params.id)
      .eq("store_id", store.id)
      .maybeSingle(),
    supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-primary">Mahsulotni tahrirlash</h1>
      <ProductFormClient
        userId={user!.id}
        categories={(categories as Category[]) || []}
        existingProduct={product as Product}
      />
    </div>
  );
}
