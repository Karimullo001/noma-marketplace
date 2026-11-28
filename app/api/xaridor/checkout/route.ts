import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkoutSchema } from "@/lib/validation/schemas";
import { notifyOrderCreated } from "@/lib/telegram/events";

export async function POST(request: Request) {
  const guard = await requireRole(["customer", "seller", "admin"]);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Manzil va telefon ma'lumotlarini tekshiring" },
      { status: 400 }
    );
  }

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return NextResponse.json({ error: "Server bazasi sozlanmagan" }, { status: 503 });

  const paymentLabel =
    parsed.data.payment_method === "card_on_delivery"
      ? "To'lov: Karta orqali"
      : "To'lov: Naqd pul";
  const combinedNotes = [paymentLabel, parsed.data.delivery_notes?.trim()]
    .filter(Boolean)
    .join(" | ");

  const { data: result, error } = await adminClient.rpc("checkout_cart", {
    p_customer_id: guard.ctx.userId,
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone,
    p_delivery_city: parsed.data.delivery_city,
    p_delivery_address: parsed.data.delivery_address,
    p_delivery_notes: combinedNotes || null,
    p_payment_method: "cash_on_delivery",
  });

  if (error || !result?.success) {
    return NextResponse.json(
      { error: result?.message || error?.message || "Buyurtma rasmiylashtirishda xatolik" },
      { status: 400 }
    );
  }

  // Trigger non-blocking Telegram notifications for created store orders
  if (Array.isArray(result.orders)) {
    for (const ord of result.orders) {
      if (ord.order_id) {
        notifyOrderCreated(ord.order_id).catch((err) => {
          console.error("[Checkout] Failed to dispatch telegram notification:", err);
        });
      }
    }
  }

  return NextResponse.json(result, { status: 201 });
}
