import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { getAdminChatIds } from "@/lib/telegram/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });

  const { data: logs, error } = await admin
    .from("audit_logs")
    .select("*")
    .eq("action", "complaint_filed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const complaints = (logs || []).map((l) => {
    const payload = (l.payload || {}) as Record<string, unknown>;
    return {
      id: l.id,
      reporter_id: l.actor_id,
      reporter_role: l.actor_role || "customer",
      reporter_name: (payload.reporter_name as string) || "Foydalanuvchi",
      reporter_phone: (payload.reporter_phone as string) || "",
      subject: (payload.subject as string) || "Murojaat",
      description: (payload.description as string) || "",
      target_type: (payload.target_type as string) || "platform",
      status: (payload.status as string) || "pending",
      admin_notes: (payload.admin_notes as string) || "",
      created_at: l.created_at,
    };
  });

  return NextResponse.json({ complaints });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Shikoyat yuborish uchun tizimga kiring." }, { status: 401 });
  }

  let body: {
    subject?: string;
    description?: string;
    target_type?: string;
    phone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const subject = body.subject?.trim();
  const description = body.description?.trim();

  if (!subject || subject.length < 3 || !description || description.length < 5) {
    return NextResponse.json(
      { error: "Mavzu va shikoyat matnini batafsil kiriting." },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });

  const reporterName = ctx.profile.full_name || ctx.email || "Foydalanuvchi";
  const reporterPhone = body.phone?.trim() || ctx.profile.phone || "";
  const targetType = body.target_type || "platform";

  const { data: inserted, error } = await admin
    .from("audit_logs")
    .insert({
      actor_id: ctx.userId,
      actor_role: ctx.profile.role,
      action: "complaint_filed",
      target_type: "complaint",
      payload: {
        reporter_name: reporterName,
        reporter_phone: reporterPhone,
        subject,
        description,
        target_type: targetType,
        status: "pending",
        admin_notes: "",
      },
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Notify all Admin Telegram bots immediately
  const adminChatIds = getAdminChatIds();
  const roleLabel = ctx.profile.role === "seller" ? "Sotuvchi" : "Xaridor";
  const msg =
    `⚠️ <b>YANGI SHIKOYAT / MUROJAAT</b>\n\n` +
    `👤 <b>Kimdan:</b> ${reporterName} (${roleLabel})\n` +
    (reporterPhone ? `📞 <b>Telefon:</b> ${reporterPhone}\n` : "") +
    `📌 <b>Mavzu:</b> ${subject}\n` +
    `📝 <b>Matn:</b> ${description}`;

  for (const chatId of adminChatIds) {
    sendTelegramMessage("admin", chatId, { text: msg }).catch((err) => {
      console.error("[Complaints] Failed to notify admin chat:", err);
    });
  }

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  let body: { id?: string; status?: string; admin_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "ID va holat talab qilinadi" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });

  const { data: existing } = await admin
    .from("audit_logs")
    .select("payload")
    .eq("id", body.id)
    .eq("action", "complaint_filed")
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Shikoyat topilmadi" }, { status: 404 });
  }

  const updatedPayload = {
    ...(existing.payload as Record<string, unknown>),
    status: body.status,
    admin_notes: body.admin_notes ?? (existing.payload as Record<string, unknown>).admin_notes,
  };

  const { error } = await admin
    .from("audit_logs")
    .update({ payload: updatedPayload })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
