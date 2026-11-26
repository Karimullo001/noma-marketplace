import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NomaLogo } from "@/components/shared/noma-logo";
import { SellerApplyClient } from "@/components/sotuvchi/seller-apply-client";

export const dynamic = "force-dynamic";

export default async function SotuvchiArizaPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sotuvchi/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sotuvchi/kirish");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "seller") redirect("/sotuvchi");
  if (profile?.role === "admin") redirect("/admin");

  const { data: pendingApp } = await supabase
    .from("seller_applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <NomaLogo subtitle="Sotuvchi Arizasi" />
          <h1 className="text-2xl font-black text-primary">Sotuvchi bo&apos;lish uchun ariza</h1>
          <p className="text-xs text-muted-foreground">
            NOMA platformasida do&apos;kon ochish uchun ariza yuboring. Administrator sizga maxsus bir martalik taklif kodini taqdim etadi.
          </p>
        </div>

        <SellerApplyClient
          defaultName={profile?.full_name || ""}
          email={user.email || ""}
          hasPendingApplication={Boolean(pendingApp)}
        />
      </div>
    </div>
  );
}
