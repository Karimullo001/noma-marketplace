import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import type { Category, Order, Product, Profile, SellerApplication, SellerInvitationCode, Store } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = (await createServerSupabaseClient())!;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return (
      <div className="p-10 text-center text-sm">
        SUPABASE_SERVICE_ROLE_KEY sozlanmagan. Admin paneli server kalitisiz ishlamaydi.
      </div>
    );
  }

  const [
    { data: apps },
    { data: codes },
    { data: stores },
    { data: products },
    { data: customers },
    { data: orders },
    { data: categories },
    { data: logs },
  ] = await Promise.all([
    adminClient.from("seller_applications").select("*").order("created_at", { ascending: false }),
    adminClient.from("seller_invitation_codes").select("*").order("created_at", { ascending: false }),
    adminClient.from("stores").select("*").order("created_at", { ascending: false }),
    adminClient.from("products").select("*, store:stores(name)").order("created_at", { ascending: false }),
    adminClient.from("profiles").select("*").eq("role", "customer").order("created_at", { ascending: false }),
    adminClient.from("orders").select("*, store:stores(name)").order("created_at", { ascending: false }),
    adminClient.from("categories").select("*").order("display_order"),
    adminClient.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  const codeRows = (codes as SellerInvitationCode[]) || [];
  const appsWithCodes = ((apps as SellerApplication[]) || []).map((a) => ({
    ...a,
    codes: codeRows.filter((c) => c.application_id === a.id),
  }));

  return (
    <AdminDashboardClient
      adminEmail={user?.email || ""}
      applications={appsWithCodes}
      stores={(stores as Store[]) || []}
      products={(products as Product[]) || []}
      customers={(customers as Profile[]) || []}
      orders={(orders as Order[]) || []}
      categories={(categories as Category[]) || []}
      auditLogs={logs || []}
    />
  );
}
