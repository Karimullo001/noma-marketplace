import React from "react";
import Link from "next/link";
import { MapPin, Phone, Star, Settings } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Store } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerMyStorePage() {
  const supabase = (await createServerSupabaseClient())!;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("seller_id", user!.id)
    .single();

  const s = store as Store;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-primary">Mening do&apos;konim</h1>
        <Link
          href="/sotuvchi/sozlamalar"
          className="px-4 py-2 rounded-xl bg-white border border-border text-xs font-bold inline-flex items-center gap-1.5 hover:bg-muted"
        >
          <Settings className="w-4 h-4" /> Tahrirlash
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-4">
          {s.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo_url} alt={s.name} className="w-20 h-20 rounded-2xl object-cover border border-border" />
          )}
          <div>
            <h2 className="text-xl font-black text-primary">{s.name}</h2>
            <p className="text-xs text-accent font-semibold">{s.category}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{Number(s.rating || 0).toFixed(1)} ({s.review_count} sharh)</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-foreground leading-relaxed">{s.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            <span>{s.city}, {s.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-accent" />
            <span>{s.phone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
