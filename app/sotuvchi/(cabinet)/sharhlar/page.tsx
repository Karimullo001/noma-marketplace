import React from "react";
import { Star } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTashkent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SellerReviewsPage() {
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

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, customer:profiles(full_name), product:products(name)")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-primary">Xaridorlar sharhlari</h1>
      {!reviews || reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center text-xs text-muted-foreground">
          Hozircha do&apos;koningiz mahsulotlariga sharhlar yozilmagan.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-border p-5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">
                  {(r.customer as { full_name?: string } | null)?.full_name || "Xaridor"} —{" "}
                  <span className="text-accent">
                    {(r.product as { name?: string } | null)?.name}
                  </span>
                </span>
                <span className="text-muted-foreground">{formatDateTashkent(r.created_at)}</span>
              </div>
              <div className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-current" /> {r.rating} / 5
              </div>
              <p className="text-foreground">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
