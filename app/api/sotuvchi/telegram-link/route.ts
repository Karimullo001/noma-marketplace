import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { generateTelegramLinkCode } from "@/lib/telegram/crypto";
import { TELEGRAM_CONFIG } from "@/lib/telegram/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/sotuvchi/telegram-link
 * Returns current Telegram linking status for the active seller.
 */
export async function GET() {
  const ctx = await getAuthenticatedContext();
  if (!ctx || ctx.profile?.role !== "seller") {
    return NextResponse.json({ error: "Faqat sotuvchilar uchun" }, { status: 401 });
  }

  return NextResponse.json({
    linked: Boolean(ctx.profile.telegram_chat_id),
    telegramChatId: ctx.profile.telegram_chat_id,
    telegramUsername: ctx.profile.telegram_username,
    botUsername: TELEGRAM_CONFIG.sellerBotUsername,
  });
}

/**
 * POST /api/sotuvchi/telegram-link
 * Generates a one-time 10-minute link code for the active seller.
 */
export async function POST(req: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx || ctx.profile?.role !== "seller") {
    return NextResponse.json({ error: "Faqat sotuvchilar uchun" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Baza ulanmagan" }, { status: 500 });
  }

  // Verify seller has an active store
  const { data: store } = await admin
    .from("stores")
    .select("id, name, status")
    .eq("seller_id", ctx.userId)
    .single();

  if (!store || store.status !== "active") {
    return NextResponse.json(
      { error: "Sizda faol do'kon mavjud emas" },
      { status: 403 }
    );
  }

  // Generate crypto random single-use code
  const { plaintextCode, codeHash, codePrefix, expiresAt } = generateTelegramLinkCode();

  // Invalidate any existing unused codes for this seller
  await admin
    .from("telegram_link_codes")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("role", "seller")
    .eq("is_used", false);

  // Store hashed code only
  const { error } = await admin.from("telegram_link_codes").insert({
    user_id: ctx.userId,
    role: "seller",
    code_hash: codeHash,
    code_prefix: codePrefix,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: "Kodni saqlashda xatolik" }, { status: 500 });
  }

  const deepLink = `https://t.me/${TELEGRAM_CONFIG.sellerBotUsername}?start=${plaintextCode}`;

  return NextResponse.json({
    ok: true,
    code: plaintextCode,
    expiresAt: expiresAt.toISOString(),
    deepLink,
    botUsername: TELEGRAM_CONFIG.sellerBotUsername,
  });
}
