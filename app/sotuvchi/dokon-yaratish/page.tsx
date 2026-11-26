import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NomaLogo } from "@/components/shared/noma-logo";
import { StoreFormClient } from "@/components/sotuvchi/store-form-client";

export const dynamic = "force-dynamic";

export default async function DokonYaratishPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sotuvchi/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sotuvchi/kirish");

  const [{ data: profile }, { data: existingStore }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("stores").select("*").eq("seller_id", user.id).maybeSingle(),
  ]);

  if (profile?.role !== "seller") redirect("/sotuvchi/ariza");
  if (existingStore) redirect("/sotuvchi");

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <NomaLogo subtitle="Yangi Do'kon" />
          <h1 className="text-2xl font-black text-primary">Do&apos;koningizni ro&apos;yxatdan o&apos;tkazing</h1>
          <p className="text-xs text-muted-foreground">
            Ma&apos;lumotlarni to&apos;ldirganingizdan so&apos;ng do&apos;koningiz bozorda darhol faollashadi.
          </p>
        </div>

        <StoreFormClient userId={user.id} existingStore={null} />
      </div>
    </div>
  );
}
