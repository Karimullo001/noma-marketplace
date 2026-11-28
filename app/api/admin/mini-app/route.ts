import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function buildLast7DaysKeys() {
  const days: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    days.push({ key, label });
  }
  return days;
}

export async function GET() {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });

  const [
    usersRes,
    storesRes,
    productsCountRes,
    ordersRes,
    appsRes,
    complaintsRes,
  ] = await Promise.all([
    admin.from("profiles").select("id, created_at"),
    admin.from("stores").select("id, name, city, phone, category, status, created_at").order("created_at", { ascending: false }),
    admin.from("products").select("id", { count: "exact", head: true }).eq("is_archived", false),
    admin.from("orders").select("id, order_number, total_amount, status, created_at, customer_name").order("created_at", { ascending: false }),
    admin.from("seller_applications").select("*").order("created_at", { ascending: false }).limit(20),
    admin.from("audit_logs").select("*").eq("action", "complaint_filed").order("created_at", { ascending: false }).limit(30),
  ]);

  const users = usersRes.data || [];
  const stores = storesRes.data || [];
  const orders = ordersRes.data || [];
  const gmv = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const complaints = (complaintsRes.data || []).map((l) => {
    const details = (l.details || {}) as Record<string, unknown>;
    return {
      id: l.id,
      reporter_role: (details.actor_role as string) || "customer",
      reporter_name: (details.reporter_name as string) || "Foydalanuvchi",
      reporter_phone: (details.reporter_phone as string) || "",
      subject: (details.subject as string) || "Murojaat",
      description: (details.description as string) || "",
      status: (details.status as string) || "pending",
      created_at: l.created_at,
    };
  });

  const days = buildLast7DaysKeys();
  const dailySeries = days.map(({ key, label }) => {
    const dayOrders = orders.filter((o) => (o.created_at || "").slice(0, 10) === key);
    const dayRevenue = dayOrders
      .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const dayUsers = users.filter((u) => (u.created_at || "").slice(0, 10) === key).length;
    return {
      date: key,
      label,
      orders: dayOrders.length,
      revenue: dayRevenue,
      users: dayUsers,
    };
  });

  return NextResponse.json({
    stats: {
      usersCount: users.length,
      activeStores: stores.filter((s) => s.status === "active").length,
      suspendedStores: stores.filter((s) => s.status === "suspended").length,
      productsCount: productsCountRes.count || 0,
      ordersCount: orders.length,
      pendingOrders: orders.filter((o) => o.status === "new" || o.status === "pending").length,
      gmv,
      pendingComplaints: complaints.filter((c) => c.status === "pending").length,
      pendingApplications: (appsRes.data || []).filter((a) => a.status === "pending").length,
    },
    dailySeries,
    recentOrders: orders.slice(0, 10),
    stores,
    applications: appsRes.data || [],
    complaints,
  });
}
