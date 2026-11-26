import { NextResponse } from "next/server";
import { requireRole, writeAuditLog } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

const storeStatusSchema = z.object({
  store_id: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
});

export async function PATCH(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return NextResponse.json({ error: "Server bazasi sozlanmagan" }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = storeStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Parametrlar noto'g'ri" }, { status: 400 });

  const { data: store, error } = await adminClient
    .from("stores")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.store_id)
    .select("*")
    .single();

  if (error || !store) return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });

  await adminClient.from("notifications").insert({
    user_id: store.seller_id,
    title: parsed.data.status === "suspended" ? "Do'kon faoliyati to'xtatildi" : "Do'kon qayta faollashtirildi",
    message:
      parsed.data.status === "suspended"
        ? "Administrator do'koningizni vaqtincha to'xtatdi. Mahsulotlar bozordan yashirildi."
        : "Do'koningiz qayta faollashtirildi va mahsulotlaringiz yana bozorda ko'rinmoqda.",
    type: "store",
    link: "/sotuvchi",
  });

  await writeAuditLog({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: parsed.data.status === "suspended" ? "SUSPEND_STORE" : "REACTIVATE_STORE",
    entityType: "store",
    entityId: store.id,
    details: { store_name: store.name, new_status: parsed.data.status },
  });

  return NextResponse.json({ store });
}
