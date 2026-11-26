import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CheckoutClient } from "@/components/xaridor/checkout-client";
import type { Address, CartItem, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/xaridor/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/xaridor/kirish?next=/xaridor/buyurtma");

  const [{ data: profile }, { data: cart }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
  ]);

  let items: CartItem[] = [];
  if (cart) {
    const { data } = await supabase
      .from("cart_items")
      .select("id, cart_id, product_id, variant_id, quantity, product:products(*, store:stores(*)), variant:product_variants(*)")
      .eq("cart_id", cart.id);
    items = (data as unknown as CartItem[]) || [];
  }

  if (items.length === 0) redirect("/xaridor/savat");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-black text-primary">Buyurtmani rasmiylashtirish</h1>
      <CheckoutClient
        profile={profile as Profile}
        items={items}
        addresses={(addresses as Address[]) || []}
      />
    </div>
  );
}
