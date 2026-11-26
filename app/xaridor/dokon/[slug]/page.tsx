import React from "react";
import { notFound } from "next/navigation";
import { MapPin, Phone, Star, Store as StoreIcon } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/xaridor/product-card";
import type { Product, Store } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StorePublicPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "active")
    .maybeSingle();

  if (!store) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("*, store:stores(*), brand:brands(*), variants:product_variants(*)")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  const typedStore = store as Store;
  const storeProducts = (products as Product[]) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="w-20 h-20 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
          {typedStore.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typedStore.logo_url} alt={typedStore.name} className="w-full h-full object-cover" />
          ) : (
            <StoreIcon className="w-8 h-8 text-accent" />
          )}
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-primary">{typedStore.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              Faol do&apos;kon
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">{typedStore.description}</p>
          <div className="flex flex-wrap gap-4 text-xs text-primary pt-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              {typedStore.city}, {typedStore.address}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-accent" />
              {typedStore.phone}
            </span>
            <span className="inline-flex items-center gap-1 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {Number(typedStore.rating || 0).toFixed(1)} ({typedStore.review_count})
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-primary">
          Do&apos;kon mahsulotlari ({storeProducts.length})
        </h2>
        {storeProducts.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white border border-border text-center text-xs text-muted-foreground">
            Ushbu do&apos;konda hozircha mahsulotlar mavjud emas.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {storeProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
