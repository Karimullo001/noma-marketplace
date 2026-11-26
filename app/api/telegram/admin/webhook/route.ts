import { NextRequest, NextResponse } from "next/server";
import { TELEGRAM_CONFIG } from "@/lib/telegram/config";
import { sendTelegramMessage, answerTelegramCallbackQuery, editTelegramMessageText } from "@/lib/telegram/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    // 1. Strict Admin Chat ID Guard
    // Any incoming message or callback NOT from TELEGRAM_ADMIN_CHAT_ID gets NO response.
    const senderChatId = update.message?.chat.id || update.callback_query?.message?.chat.id;
    const adminChatId = TELEGRAM_CONFIG.adminChatId;

    if (!senderChatId || senderChatId.toString() !== adminChatId.toString()) {
      // Silently ignore unauthorized chats
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 2. Handle Callback Queries with Confirmation Steps
    if (update.callback_query) {
      await handleAdminCallback(update.callback_query, senderChatId);
      return NextResponse.json({ ok: true });
    }

    // 3. Handle Admin Commands
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();

    if (text === "/start") {
      await sendTelegramMessage("admin", senderChatId, {
        text: `🛡️ <b>NOMA Platformasi Administrator Boti</b>\n\n` +
          `Assalomu alaykum, Administrator! Siz muvaffaqiyatli autentifikatsiyadan o'tgansiz.\n\n` +
          `<b>Mavjud buyruqlar:</b>\n` +
          `• /statistika — Platforma real ko'rsatkichlari (do'konlar, tovarlar, buyurtmalar, GMV)\n` +
          `• /panel — Veb admin paneliga kirish`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📊 Statistikani ko'rish",
                callback_data: "admin_stats",
              },
            ],
            [
              {
                text: "🌐 Veb Admin Panel",
                url: `${TELEGRAM_CONFIG.siteUrl}/admin`,
              },
            ],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (text === "/statistika") {
      await sendAdminStatistics(senderChatId);
      return NextResponse.json({ ok: true });
    }

    if (text === "/panel") {
      await sendTelegramMessage("admin", senderChatId, {
        text: `🌐 <b>NOMA Veb Admin Paneli:</b>\n<a href="${TELEGRAM_CONFIG.siteUrl}/admin">${TELEGRAM_CONFIG.siteUrl}/admin</a>`,
        disable_web_page_preview: true,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[Telegram Admin Webhook] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    bot: "admin",
    username: TELEGRAM_CONFIG.adminBotUsername,
    status: "active",
  });
}

/**
 * Calculates and sends real platform statistics to the administrator.
 */
async function sendAdminStatistics(chatId: string | number) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    await sendTelegramMessage("admin", chatId, { text: "Baza ulanmagan." });
    return;
  }

  const [storesRes, prodsRes, ordersRes, appsRes] = await Promise.all([
    admin.from("stores").select("id, status"),
    admin.from("products").select("id", { count: "exact" }).eq("is_active", true).eq("is_archived", false),
    admin.from("orders").select("id, total_amount, status"),
    admin.from("seller_applications").select("id", { count: "exact" }).eq("status", "pending"),
  ]);

  const allStores = storesRes.data || [];
  const activeStores = allStores.filter((s) => s.status === "active").length;
  const suspendedStores = allStores.filter((s) => s.status === "suspended").length;

  const totalProducts = prodsRes.count || 0;
  const pendingApps = appsRes.count || 0;

  const allOrders = ordersRes.data || [];
  const totalOrders = allOrders.length;
  const totalGMV = allOrders
    .filter((o) => o.status !== "rejected" && o.status !== "cancelled")
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const text = `📊 <b>NOMA Platformasi Ko'rsatkichlari:</b>\n\n` +
    `🏪 <b>Do'konlar:</b>\n` +
    `• Jami: <b>${allStores.length}</b> ta\n` +
    `• Faol: <b>${activeStores}</b> ta\n` +
    `• To'xtatilgan: <b>${suspendedStores}</b> ta\n\n` +
    `👗 <b>Mahsulotlar:</b> <b>${totalProducts}</b> ta faol tovar\n` +
    `📝 <b>Kutilayotgan arizalar:</b> <b>${pendingApps}</b> ta yangi sotuvchi\n\n` +
    `📦 <b>Buyurtmalar:</b> <b>${totalOrders}</b> ta\n` +
    `💰 <b>Umumiy aylanma (GMV):</b> <b>${formatPrice(totalGMV)}</b>`;

  await sendTelegramMessage("admin", chatId, {
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Yangilash", callback_data: "admin_stats" }],
        [{ text: "🌐 Admin Panel", url: `${TELEGRAM_CONFIG.siteUrl}/admin` }],
      ],
    },
  });
}

/**
 * Handles admin callbacks with confirmation steps and writes to audit_logs.
 */
async function handleAdminCallback(
  cb: { id: string; data?: string; message?: { message_id: number; text?: string } },
  chatId: string | number
) {
  const data = cb.data;
  if (!data) return;

  const admin = createAdminSupabaseClient();
  if (!admin) return;

  if (data === "admin_stats") {
    await answerTelegramCallbackQuery("admin", cb.id);
    await sendAdminStatistics(chatId);
    return;
  }

  // Destructive Step 1: Confirmation Request
  if (data.startsWith("ask_suspend_store:")) {
    const storeId = data.replace("ask_suspend_store:", "");
    await answerTelegramCallbackQuery("admin", cb.id);

    if (cb.message?.message_id) {
      await editTelegramMessageText(
        "admin",
        chatId,
        cb.message.message_id,
        (cb.message.text || "") + "\n\n⚠️ <b>DIQQAT:</b> Ushbu do'konni rostdan ham to'xtatmoqchimisiz? (Do'kon mahsulotlari marketpleysdan o'chiriladi)",
        {
          inline_keyboard: [
            [
              { text: "🛑 Ha, to'xtatilsin", callback_data: `confirm_suspend_store:${storeId}` },
              { text: "Bekor qilish", callback_data: `cancel_action` },
            ],
          ],
        }
      );
    }
    return;
  }

  // Destructive Step 2: Confirmed Action -> Write to audit_logs
  if (data.startsWith("confirm_suspend_store:")) {
    const storeId = data.replace("confirm_suspend_store:", "");

    const { data: store, error: updateErr } = await admin
      .from("stores")
      .update({ status: "suspended", updated_at: new Date().toISOString() })
      .eq("id", storeId)
      .select("name")
      .single();

    if (updateErr) {
      await answerTelegramCallbackQuery("admin", cb.id, "Xatolik yuz berdi", true);
      return;
    }

    // Write audit log
    await admin.from("audit_logs").insert({
      actor_email: "telegram_admin",
      action: "store_suspended_via_telegram",
      entity_type: "store",
      entity_id: storeId,
      details: {
        store_name: store?.name,
        admin_chat_id: chatId.toString(),
      },
    });

    await answerTelegramCallbackQuery("admin", cb.id, "Do'kon to'xtatildi!");
    if (cb.message?.message_id) {
      await editTelegramMessageText(
        "admin",
        chatId,
        cb.message.message_id,
        (cb.message.text || "") + `\n\n✅ <b>Do'kon to'xtatildi (${store?.name || storeId}).</b> Audit jurnaliga yozildi.`
      );
    }
    return;
  }

  if (data === "cancel_action") {
    await answerTelegramCallbackQuery("admin", cb.id, "Amal bekor qilindi.");
    if (cb.message?.message_id && cb.message?.text) {
      await editTelegramMessageText(
        "admin",
        chatId,
        cb.message.message_id,
        cb.message.text + "\n\n<i>Amal bekor qilindi.</i>"
      );
    }
    return;
  }
}
