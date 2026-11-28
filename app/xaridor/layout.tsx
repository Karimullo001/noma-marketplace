import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { XaridorHeader } from "@/components/xaridor/xaridor-header";
import { XaridorFooter } from "@/components/xaridor/xaridor-footer";
import { MobileBottomNav } from "@/components/xaridor/mobile-bottom-nav";
import { RealtimeRefresh } from "@/components/shared/realtime-listener";
import { PhonePromptModal } from "@/components/xaridor/phone-prompt-modal";
import type { Category, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function XaridorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  let categories: Category[] = [];
  let profile: Profile | null = null;
  let cartCount = 0;
  let favoritesCount = 0;

  if (supabase) {
    const { data: catRows } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    categories = (catRows as Category[]) || [];

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = (prof as Profile) ?? null;

      const { data: cart } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cart) {
        const { data: items } = await supabase
          .from("cart_items")
          .select("quantity")
          .eq("cart_id", cart.id);
        cartCount = (items || []).reduce((acc, i) => acc + i.quantity, 0);
      }

      const { count } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      favoritesCount = count ?? 0;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <RealtimeRefresh
        channelName="marketplace-live-updates"
        subscriptions={[
          { table: "products" },
          { table: "product_variants" },
          { table: "stores" },
        ]}
      />
      <XaridorHeader
        categories={categories}
        profile={profile}
        cartCount={cartCount}
        favoritesCount={favoritesCount}
      />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <PhonePromptModal />
      <MobileBottomNav cartCount={cartCount} />
      <XaridorFooter />
    </div>
  );
}
