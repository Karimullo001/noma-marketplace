import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NomaLogo } from "@/components/shared/noma-logo";
import { VerifyCodeClient } from "@/components/sotuvchi/verify-code-client";

export const dynamic = "force-dynamic";

export default async function SotuvchiTasdiqlashPage({
  searchParams,
}: {
  searchParams?: { notice?: string };
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sotuvchi/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sotuvchi/kirish");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "seller") redirect("/sotuvchi");
  if (profile?.role === "admin") redirect("/admin");

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <NomaLogo subtitle="Kod Tasdiqlash" />
          <h1 className="text-2xl font-black text-primary">
            Do&apos;koningiz uchun maxsus taklif kodini kiriting
          </h1>
          {searchParams?.notice === "code_sent_to_admin" && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              ✅ Administrator Telegram botiga tasdiqlash kodi yuborildi. Administrator taqdim etgan kodni kiriting — shundan so&apos;ng sotuvchi kabineti ochiladi.
            </p>
          )}
        </div>
        <VerifyCodeClient />
      </div>
    </div>
  );
}
