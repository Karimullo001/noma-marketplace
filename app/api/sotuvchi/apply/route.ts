import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSellerCodeExpiryHours, isTelegramConfigured } from "@/lib/config";
import { sellerApplySchema } from "@/lib/validation/schemas";
import { generateOneTimeSellerCode, getCodePrefix, hashInvitationCode } from "@/lib/security/code-hash";
import { sendSellerCodeToAdminTelegram } from "@/lib/telegram/bot";
import { checkAndIncrementRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Avval Google yoki Apple orqali tizimga kiring." }, { status: 401 });
  }

  if (ctx.profile.role === "admin") {
    return NextResponse.json({ error: "Administrator sotuvchi arizasini yubora olmaydi." }, { status: 403 });
  }

  if (ctx.profile.role === "seller") {
    return NextResponse.json({ error: "Siz allaqachon sotuvchi sifatida tasdiqlangansiz." }, { status: 400 });
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      {
        error: "Administrator Telegram boti sozlanmagan. Iltimos administrator bilan bog'laning.",
        code: "TELEGRAM_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server ma'lumotlar bazasi sozlanmagan." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov formati" }, { status: 400 });
  }

  const parsed = sellerApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" },
      { status: 400 }
    );
  }

  // Rate limit application submissions (max 3 per hour per user)
  const rl = await checkAndIncrementRateLimit(adminClient, `seller_apply:${ctx.userId}`, {
    maxAttempts: 3,
    windowMinutes: 60,
    lockoutMinutes: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.message }, { status: 429 });
  }

  // Revoke any previous unused codes for this applicant so only the latest code is valid
  await adminClient
    .from("seller_invitation_codes")
    .update({ is_revoked: true })
    .eq("applicant_id", ctx.userId)
    .eq("is_used", false)
    .eq("is_revoked", false);

  await adminClient
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", ctx.userId);

  const { data: application, error: appErr } = await adminClient
    .from("seller_applications")
    .insert({
      user_id: ctx.userId,
      full_name: parsed.data.fullName,
      email: ctx.email || ctx.profile.email || "Email ko'rsatilmagan",
      status: "pending",
    })
    .select("*")
    .single();

  if (appErr || !application) {
    return NextResponse.json({ error: "Arizani saqlashda xatolik yuz berdi." }, { status: 500 });
  }

  const plaintextCode = generateOneTimeSellerCode();
  const codeHash = hashInvitationCode(plaintextCode);
  const codePrefix = getCodePrefix(plaintextCode);
  const expiryHours = getSellerCodeExpiryHours();
  const expiresAt = new Date(Date.now() + expiryHours * 3600_000).toISOString();

  const { error: codeErr } = await adminClient.from("seller_invitation_codes").insert({
    application_id: application.id,
    applicant_id: ctx.userId,
    code_hash: codeHash,
    code_prefix: codePrefix,
    expires_at: expiresAt,
  });

  if (codeErr) {
    return NextResponse.json({ error: "Taklif kodini yaratishda xatolik yuz berdi." }, { status: 500 });
  }

  // Send plaintext code ONLY to admin's private Telegram chat
  const tgResult = await sendSellerCodeToAdminTelegram({
    applicantName: parsed.data.fullName,
    applicantEmail: ctx.email || ctx.profile.email || "Noma'lum",
    code: plaintextCode,
    expiresAtIso: expiresAt,
  });

  if (!tgResult.sent) {
    // Rollback un-delivered code
    await adminClient.from("seller_invitation_codes").delete().eq("application_id", application.id);
    await adminClient.from("seller_applications").delete().eq("id", application.id);
    return NextResponse.json(
      { error: tgResult.error || "Telegram bot orqali kod yuborib bo'lmadi." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "Arizangiz yuborildi! Administrator sizga shaxsiy taklif kodini Telegram orqali oladi va taqdim etadi.",
    applicationId: application.id,
  });
}
