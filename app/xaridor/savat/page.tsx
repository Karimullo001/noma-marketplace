import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SavatClient } from "@/components/xaridor/savat-client";
import type { CartItem } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SavatPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/xaridor/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/xaridor/kirish?next=/xaridor/savat");

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let items: CartItem[] = [];
  if (cart) {
    const { data } = await supabase
      .from("cart_items")
      .select("id, cart_id, product_id, variant_id, quantity, product:products(*, store:stores(*)), variant:product_variants(*)")
      .eq("cart_id", cart.id)
      .order("created_at", { ascending: true });
    items = (data as unknown as CartItem[]) || [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-black text-primary">Xarid savati</h1>
      <SavatClient initialItems={items} />
    </div>
  );
}
