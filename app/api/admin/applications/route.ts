import { NextResponse } from "next/server";
import { requireRole, writeAuditLog } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSellerCodeExpiryHours, isTelegramConfigured } from "@/lib/config";
import { generateOneTimeSellerCode, getCodePrefix, hashInvitationCode } from "@/lib/security/code-hash";
import { sendSellerCodeToAdminTelegram } from "@/lib/telegram/bot";
import { z } from "zod";

const adminAppActionSchema = z.object({
  action: z.enum(["revoke_code", "regenerate_code"]),
  application_id: z.string().uuid(),
  code_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
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

  const parsed = adminAppActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "So'rov parametrlari noto'g'ri" }, { status: 400 });
  }

  const { data: app } = await adminClient
    .from("seller_applications")
    .select("*")
    .eq("id", parsed.data.application_id)
    .maybeSingle();

  if (!app) return NextResponse.json({ error: "Ariza topilmadi" }, { status: 404 });

  if (parsed.data.action === "revoke_code") {
    await adminClient
      .from("seller_invitation_codes")
      .update({ is_revoked: true })
      .eq("application_id", app.id)
      .eq("is_used", false);

    await adminClient
      .from("seller_applications")
      .update({ status: "revoked" })
      .eq("id", app.id);

    await writeAuditLog({
      actorId: guard.ctx.userId,
      actorEmail: guard.ctx.email,
      action: "REVOKE_INVITATION_CODE",
      entityType: "seller_application",
      entityId: app.id,
      details: { applicant_email: app.email },
    });

    return NextResponse.json({ success: true, message: "Kod bekor qilindi" });
  }

  // Regenerate & resend via Telegram bot
  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: "Telegram bot sozlanmagan" }, { status: 503 });
  }

  // Revoke previous unused codes for this application
  await adminClient
    .from("seller_invitation_codes")
    .update({ is_revoked: true })
    .eq("application_id", app.id)
    .eq("is_used", false);

  const plaintextCode = generateOneTimeSellerCode();
  const codeHash = hashInvitationCode(plaintextCode);
  const codePrefix = getCodePrefix(plaintextCode);
  const expiresAt = new Date(Date.now() + getSellerCodeExpiryHours() * 3600_000).toISOString();

  await adminClient.from("seller_invitation_codes").insert({
    application_id: app.id,
    applicant_id: app.user_id,
    code_hash: codeHash,
    code_prefix: codePrefix,
    expires_at: expiresAt,
    created_by_admin_id: guard.ctx.userId,
  });

  await adminClient
    .from("seller_applications")
    .update({ status: "pending" })
    .eq("id", app.id);

  const tgRes = await sendSellerCodeToAdminTelegram({
    applicantName: app.full_name,
    applicantEmail: app.email,
    code: plaintextCode,
    expiresAtIso: expiresAt,
    isRegenerated: true,
  });

  if (!tgRes.sent) {
    return NextResponse.json({ error: tgRes.error || "Telegram xabar yuborilmadi" }, { status: 502 });
  }

  await writeAuditLog({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: "REGENERATE_INVITATION_CODE",
    entityType: "seller_application",
    entityId: app.id,
    details: { applicant_email: app.email, code_prefix: codePrefix },
  });

  return NextResponse.json({ success: true, message: "Yangi kod Telegram botga yuborildi" });
}
