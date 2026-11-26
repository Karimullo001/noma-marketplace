import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductDetailClient } from "@/components/xaridor/product-detail-client";
import { RealtimeRefresh } from "@/components/shared/realtime-listener";
import type { Product, Review } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MahsulotPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: product } = await supabase
    .from("products")
    .select("*, store:stores!inner(*), category:categories(*), brand:brands(*), variants:product_variants(*)")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .eq("is_archived", false)
    .eq("store.status", "active")
    .maybeSingle();

  if (!product) notFound();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, customer:profiles(full_name, avatar_url)")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });

  let initialFavorited = false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();
    initialFavorited = Boolean(fav);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <RealtimeRefresh
        channelName={`product-${product.id}`}
        subscriptions={[{ table: "product_variants", filter: `product_id=eq.${product.id}` }]}
      />
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Link href="/xaridor" className="hover:text-accent">Bosh sahifa</Link>
        <span>/</span>
        <Link href="/xaridor/katalog" className="hover:text-accent">Katalog</Link>
        <span>/</span>
        <span className="text-primary font-medium truncate">{product.name}</span>
      </div>

      <ProductDetailClient
        product={product as Product}
        reviews={(reviews as Review[]) || []}
        initialFavorited={initialFavorited}
      />
    </div>
  );
}
