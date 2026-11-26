import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { orderStatusUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireRole(["seller"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = orderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Buyurtma ma'lumotlari noto'g'ri" },
      { status: 400 }
    );
  }

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return NextResponse.json({ error: "Server bazasi sozlanmagan" }, { status: 503 });

  const { data: result, error } = await adminClient.rpc("transition_order_status", {
    p_order_id: params.id,
    p_actor_id: guard.ctx.userId,
    p_new_status: parsed.data.status,
    p_delivery_fee: parsed.data.delivery_fee ?? null,
    p_estimated_time: parsed.data.estimated_time ?? null,
    p_delivery_method: parsed.data.delivery_method ?? null,
    p_courier_contact: parsed.data.courier_contact ?? null,
    p_tracking_note: parsed.data.tracking_note ?? null,
  });

  if (error || !result?.success) {
    return NextResponse.json(
      { error: result?.message || error?.message || "Buyurtma holatini o'zgartirib bo'lmadi" },
      { status: 400 }
    );
  }

  // Trigger non-blocking customer notification on Customer Bot
  import("@/lib/telegram/events").then(({ notifyOrderStatusChanged }) => {
    notifyOrderStatusChanged(params.id, parsed.data.status, {
      deliveryFee: parsed.data.delivery_fee,
      estimatedTime: parsed.data.estimated_time,
      courierContact: parsed.data.courier_contact,
      trackingNote: parsed.data.tracking_note,
    }).catch((err) => {
      console.error("[Orders API] Failed to dispatch order status notification:", err);
    });
  });

  return NextResponse.json({ success: true, status: result.status });
}
