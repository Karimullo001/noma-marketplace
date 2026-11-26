import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });

  const [
    usersCountRes,
    storesRes,
    productsCountRes,
    ordersRes,
    appsRes,
    complaintsRes,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("stores").select("id, name, city, phone, category, status, created_at").order("created_at", { ascending: false }),
    admin.from("products").select("id", { count: "exact", head: true }).eq("is_archived", false),
    admin.from("orders").select("total_amount, status"),
    admin.from("seller_applications").select("*").order("created_at", { ascending: false }).limit(20),
    admin.from("audit_logs").select("*").eq("action", "complaint_filed").order("created_at", { ascending: false }).limit(30),
  ]);

  const stores = storesRes.data || [];
  const orders = ordersRes.data || [];
  const gmv = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const complaints = (complaintsRes.data || []).map((l) => {
    const payload = (l.payload || {}) as Record<string, unknown>;
    return {
      id: l.id,
      reporter_role: l.actor_role || "customer",
      reporter_name: (payload.reporter_name as string) || "Foydalanuvchi",
      reporter_phone: (payload.reporter_phone as string) || "",
      subject: (payload.subject as string) || "Murojaat",
      description: (payload.description as string) || "",
      status: (payload.status as string) || "pending",
      created_at: l.created_at,
    };
  });

  return NextResponse.json({
    stats: {
      usersCount: usersCountRes.count || 0,
      activeStores: stores.filter((s) => s.status === "active").length,
      suspendedStores: stores.filter((s) => s.status === "suspended").length,
      productsCount: productsCountRes.count || 0,
      ordersCount: orders.length,
      gmv,
      pendingComplaints: complaints.filter((c) => c.status === "pending").length,
    },
    stores,
    applications: appsRes.data || [],
    complaints,
  });
}
