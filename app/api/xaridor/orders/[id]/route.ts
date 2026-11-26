import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

const customerOrderActionSchema = z.object({
  action: z.enum(["confirm_delivered", "cancel"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireRole(["customer"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = customerOrderActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Amal noto'g'ri" }, { status: 400 });
  }

  const nextStatus = parsed.data.action === "confirm_delivered" ? "delivered" : "cancelled";
  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return NextResponse.json({ error: "Server bazasi sozlanmagan" }, { status: 503 });

  const { data: result, error } = await adminClient.rpc("transition_order_status", {
    p_order_id: params.id,
    p_actor_id: guard.ctx.userId,
    p_new_status: nextStatus,
  });

  if (error || !result?.success) {
    return NextResponse.json(
      { error: result?.message || error?.message || "Buyurtmani yangilab bo'lmadi" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, status: result.status });
}
