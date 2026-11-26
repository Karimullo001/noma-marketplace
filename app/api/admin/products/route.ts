import { NextResponse } from "next/server";
import { requireRole, writeAuditLog } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

const adminProductSchema = z.object({
  product_id: z.string().uuid(),
  action: z.enum(["deactivate", "activate", "delete"]),
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

  const parsed = adminProductSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Parametrlar noto'g'ri" }, { status: 400 });

  if (parsed.data.action === "delete") {
    await adminClient.from("products").delete().eq("id", parsed.data.product_id);
  } else {
    await adminClient
      .from("products")
      .update({ is_active: parsed.data.action === "activate" })
      .eq("id", parsed.data.product_id);
  }

  await writeAuditLog({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: `PRODUCT_${parsed.data.action.toUpperCase()}`,
    entityType: "product",
    entityId: parsed.data.product_id,
  });

  return NextResponse.json({ success: true });
}
