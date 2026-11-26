import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StoreFormClient } from "@/components/sotuvchi/store-form-client";
import { SellerTelegramLink } from "@/components/sotuvchi/seller-telegram-link";
import type { Store } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerSettingsPage() {
  const supabase = (await createServerSupabaseClient())!;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("seller_id", user!.id)
    .single();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-primary">Do&apos;kon sozlamalari</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Do&apos;kon nomi, manzili, logotipi va aloqa ma&apos;lumotlarini yangilang
        </p>
      </div>

      {/* Telegram Notifications Integration */}
      <SellerTelegramLink />

      <StoreFormClient
        userId={user!.id}
        existingStore={store as Store}
        redirectToAfterSave="/sotuvchi/sozlamalar"
      />
    </div>
  );
}
