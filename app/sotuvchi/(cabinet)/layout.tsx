import React from "react";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SellerSidebar } from "@/components/sotuvchi/seller-sidebar";
import { RealtimeRefresh } from "@/components/shared/realtime-listener";
import type { Store } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function SellerCabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/sotuvchi/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sotuvchi/kirish");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_suspended) redirect("/sotuvchi/kirish");
  if (profile.role === "admin") redirect("/admin");
  if (profile.role !== "seller") redirect("/sotuvchi/ariza");

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("seller_id", user.id)
    .maybeSingle();

  if (!store) redirect("/sotuvchi/dokon-yaratish");

  const typedStore = store as Store;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <RealtimeRefresh
        channelName={`seller-${typedStore.id}`}
        subscriptions={[
          { table: "orders", filter: `store_id=eq.${typedStore.id}` },
          { table: "stores", filter: `id=eq.${typedStore.id}` },
          { table: "notifications", filter: `user_id=eq.${user.id}` },
        ]}
      />
      <SellerSidebar store={typedStore} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
        {typedStore.status === "suspended" && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong className="block">Do&apos;koningiz vaqtincha to&apos;xtatilgan</strong>
              <span>
                Administrator do&apos;koningizni to&apos;xtatgan. Mahsulotlaringiz hozir xaridorlarga ko&apos;rinmaydi.
              </span>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
