import React from "react";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/xaridor/product-card";
import type { Product } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SevimlilarPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/xaridor/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/xaridor/kirish?next=/xaridor/sevimlilar");

  const { data } = await supabase
    .from("favorites")
    .select("product:products(*, store:stores(*), brand:brands(*), variants:product_variants(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const products = (data || [])
    .map((row) => row.product as unknown as Product)
    .filter((p) => p && p.is_active && !p.is_archived);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-black text-primary">Saralangan mahsulotlar ({products.length})</h1>
      {products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-2">
          <Heart className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <h2 className="text-base font-bold text-primary">Saralanganlar bo&apos;sh</h2>
          <p className="text-xs text-muted-foreground">Yoqtirgan kiyimlaringizdagi yurakcha belgisini bosing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} initialFavorited />
          ))}
        </div>
      )}
    </div>
  );
}
