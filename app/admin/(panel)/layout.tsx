import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/config";
import { RealtimeRefresh } from "@/components/shared/realtime-listener";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/kirish");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/admin/kirish?error=forbidden");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_suspended || profile.role !== "admin") {
    redirect("/admin/kirish?error=forbidden");
  }

  return (
    <div className="min-h-screen bg-background">
      <RealtimeRefresh
        channelName="admin-live-counters"
        subscriptions={[
          { table: "seller_applications" },
          { table: "stores" },
          { table: "orders" },
          { table: "products" },
        ]}
      />
      {children}
    </div>
  );
}
