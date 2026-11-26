import { NextRequest, NextResponse } from "next/server";
import { TELEGRAM_CONFIG } from "@/lib/telegram/config";
import { sendTelegramMessage, answerTelegramCallbackQuery, editTelegramMessageText } from "@/lib/telegram/client";
import { hashTelegramLinkCode } from "@/lib/telegram/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enqueueTelegramNotification } from "@/lib/telegram/outbox";
import { formatPrice, formatDateTashkent, ORDER_STATUS_UZ } from "@/lib/utils";
import type { TelegramUpdate, InlineKeyboardMarkup } from "@/lib/telegram/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    // 1. Handle Callback Queries (e.g., Qabul qilish, Rad etish, Status o'zgartirish)
    if (update.callback_query) {
      await handleSellerCallback(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    // 2. Handle Text Messages
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const from = message.from;
    const text = message.text.trim();
    const siteUrl = TELEGRAM_CONFIG.siteUrl;

    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const maybeCode = parts[1]?.trim();

      if (maybeCode) {
        // Seller is attempting to link store via one-time code
        await handleSellerLinking(chatId, from, maybeCode);
        return NextResponse.json({ ok: true });
      }

      // No code provided: check if already linked
      await handleSellerStatus(chatId, from?.id);
      return NextResponse.json({ ok: true });
    }

    if (text === "/ombor") {
      await handleSellerLowStock(chatId, from?.id);
      return NextResponse.json({ ok: true });
    }

    if (text === "/yordam") {
      await sendTelegramMessage("seller", chatId, {
        text: `🏪 <b>NOMA Sotuvchi Boti Yordam</b>\n\n` +
          `• <b>Yangi buyurtmalar:</b> Har safar xaridor sizning do'koningizdan kiyim buyurtma qilganda, ushbu bot orqali darhol to'liq ma'lumot va inline tugmalar olasiz.\n` +
          `• <b>Buyruqlar:</b>\n` +
          `  /ombor — Kam qolgan tovarlar ro'yxati\n` +
          `  /yordam — Qo'llanma\n\n` +
          `Do'kon kabinetingiz: <a href="${siteUrl}/sotuvchi">${siteUrl}/sotuvchi</a>`,
        disable_web_page_preview: true,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[Telegram Seller Webhook] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    bot: "seller",
    username: TELEGRAM_CONFIG.sellerBotUsername,
    status: "active",
  });
}

/**
 * Redeems single-use link code atomically and stores telegram_chat_id on seller's profile.
 */
async function handleSellerLinking(
  chatId: string | number,
  from: { id: number; first_name?: string; username?: string } | undefined,
  plaintextCode: string
) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    await sendTelegramMessage("seller", chatId, { text: "Tizim bazasi vaqtincha mavjud emas." });
    return;
  }

  const codeHash = hashTelegramLinkCode(plaintextCode);
  const telegramId = from ? from.id.toString() : null;
  const username = from?.username || null;

  // Call atomic PostgreSQL function
  const { data: result, error: rpcErr } = await admin.rpc("redeem_telegram_link_code", {
    p_code_hash: codeHash,
    p_chat_id: chatId.toString(),
    p_telegram_id: telegramId,
    p_telegram_username: username,
  });

  if (rpcErr || !result || !result.success) {
    const errorMsg = result?.message || rpcErr?.message || "Bog'lanish kodi noto'g'ri yoki muddati tugagan.";
    await sendTelegramMessage("seller", chatId, {
      text: `❌ <b>Bog'lanish muvaffaqiyatsiz bo'ldi</b>\n\n${errorMsg}\n\nIltimos, sotuvchi kabinetingizdan yangi kod oling: <a href="${TELEGRAM_CONFIG.siteUrl}/sotuvchi">${TELEGRAM_CONFIG.siteUrl}/sotuvchi</a>`,
    });
    return;
  }

  await sendTelegramMessage("seller", chatId, {
    text: `🎉 <b>Do'koningiz muvaffaqiyatli ulandi!</b>\n\n` +
      `Do'kon: <b>${result.store_name || "NOMA Do'koni"}</b>\n` +
      `Sotuvchi: <b>${result.full_name}</b>\n\n` +
      `Endi barcha yangi buyurtmalar, to'lovlar va ombor qoldiqlari haqida shu yerda tezkor xabar olasiz!`,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🏪 Sotuvchi kabinetini ochish",
            url: `${TELEGRAM_CONFIG.siteUrl}/sotuvchi`,
          },
        ],
        [
          {
            text: "📦 Ombor qoldig'ini tekshirish",
            callback_data: "check_stock",
          },
        ],
      ],
    },
  });
}

/**
 * Checks seller status and replies with welcome or instructions.
 */
async function handleSellerStatus(chatId: string | number, telegramId?: number) {
  if (!telegramId) return;

  const admin = createAdminSupabaseClient();
  if (!admin) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, role, store:stores(*)")
    .eq("telegram_id", telegramId.toString())
    .single();

  if (profile && profile.role === "seller") {
    const storeObj = Array.isArray(profile.store) ? profile.store[0] : profile.store;
    const storeName = storeObj?.name || "Do'koningiz";

    await sendTelegramMessage("seller", chatId, {
      text: `Assalomu alaykum, <b>${profile.full_name}</b>! 🏪\n\n` +
        `Sizning <b>${storeName}</b> do'koningiz NOMA tizimiga ulangan.\n\n` +
        `Yangi buyurtmalar kelishi bilan ushbu bot sizga xabar beradi.`,
      reply_markup: {
        inline_keyboard: [
          [{ text: "📱 Sotuvchi Mini App", web_app: { url: `${TELEGRAM_CONFIG.siteUrl}/sotuvchi/tg` } }],
          [{ text: "🏪 Do'kon kabineti", url: `${TELEGRAM_CONFIG.siteUrl}/sotuvchi` }],
          [{ text: "📦 Ombor holati", callback_data: "check_stock" }],
        ],
      },
    });
  } else {
    await sendTelegramMessage("seller", chatId, {
      text: `Assalomu alaykum! 🏪\n\nBu NOMA moda marketpleysining sotuvchilar boti.\n\n` +
        `Do'koningizni ulash uchun:\n` +
        `1. Kompyuter yoki telefoningizda <a href="${TELEGRAM_CONFIG.siteUrl}/sotuvchi">Sotuvchi kabineti</a>ga kiring.\n` +
        `2. <b>'Telegramni ulash'</b> tugmasini bosing va berilgan maxsus kod bilan ushbu botga kiring.`,
      disable_web_page_preview: true,
    });
  }
}

/**
 * Lists low-stock variants for this seller.
 */
async function handleSellerLowStock(chatId: string | number, telegramId?: number) {
  if (!telegramId) return;
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, store:stores(id, name)")
    .eq("telegram_id", telegramId.toString())
    .single();

  const storeObj = profile ? (Array.isArray(profile.store) ? profile.store[0] : profile.store) : null;
  if (!storeObj) {
    await sendTelegramMessage("seller", chatId, { text: "Sizga biriktirilgan faol do'kon topilmadi." });
    return;
  }

  // Find products of this store with low stock variants (<= 3)
  const { data: variants } = await admin
    .from("product_variants")
    .select("id, size, color, stock_quantity, product:products!inner(name, store_id)")
    .eq("product.store_id", storeObj.id)
    .lte("stock_quantity", 3)
    .order("stock_quantity", { ascending: true })
    .limit(10);

  if (!variants || variants.length === 0) {
    await sendTelegramMessage("seller", chatId, {
      text: `✅ <b>Omboringizda barcha tovarlar yetarli miqdorda mavjud!</b>\n\nDo'kon: ${storeObj.name}`,
    });
    return;
  }

  let text = `⚠️ <b>Kam qolgan yoki tugagan tovarlar:</b>\n\n`;
  for (const v of variants) {
    const prod = v.product as unknown as { name?: string };
    const pName = prod?.name || "Mahsulot";
    const statusLabel = v.stock_quantity === 0 ? "❌ Tugagan (0 dona)" : `⚠️ Qoldi: ${v.stock_quantity} dona`;
    text += `• <b>${pName}</b> (${v.size} / ${v.color})\n  Holati: ${statusLabel}\n\n`;
  }

  await sendTelegramMessage("seller", chatId, {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "⚡ Omborni tezkor yangilash",
            url: `${TELEGRAM_CONFIG.siteUrl}/sotuvchi/ombor`,
          },
        ],
      ],
    },
  });
}

/**
 * Handles inline callbacks from order notification buttons.
 */
async function handleSellerCallback(cb: { id: string; from: { id: number }; message?: { message_id: number; chat: { id: number | string }; text?: string }; data?: string }) {
  const data = cb.data;
  if (!data) return;

  const admin = createAdminSupabaseClient();
  if (!admin) return;

  const telegramId = cb.from.id.toString();
  const chatId = cb.message?.chat.id || telegramId;
  const messageId = cb.message?.message_id;

  if (data === "check_stock") {
    await answerTelegramCallbackQuery("seller", cb.id);
    await handleSellerLowStock(chatId, cb.from.id);
    return;
  }

  // Pattern: order_status:<orderId>:<newStatus>
  if (data.startsWith("order_status:")) {
    const [, orderId, newStatus] = data.split(":");

    // Verify seller ownership of this order
    const { data: order } = await admin
      .from("orders")
      .select("id, order_number, status, total_amount, customer_id, store:stores!inner(seller_id, name)")
      .eq("id", orderId)
      .single();

    if (!order) {
      await answerTelegramCallbackQuery("seller", cb.id, "Buyurtma topilmadi.", true);
      return;
    }

    const storeObj = order.store as unknown as { seller_id?: string; name?: string };

    // Get seller profile by telegram id
    const { data: sellerProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (!sellerProfile || sellerProfile.id !== storeObj?.seller_id) {
      await answerTelegramCallbackQuery("seller", cb.id, "Siz faqat o'z do'koningiz buyurtmalarini boshqara olasiz!", true);
      return;
    }

    // Call transition_order_status RPC
    const { data: transResult, error: transErr } = await admin.rpc("transition_order_status", {
      p_order_id: orderId,
      p_actor_id: sellerProfile.id,
      p_new_status: newStatus,
    });

    if (transErr || !transResult || !transResult.success) {
      const msg = transResult?.message || transErr?.message || "Holatni o'zgartirishda xatolik";
      await answerTelegramCallbackQuery("seller", cb.id, msg, true);
      return;
    }

    await answerTelegramCallbackQuery("seller", cb.id, `Buyurtma holati "${ORDER_STATUS_UZ[newStatus as keyof typeof ORDER_STATUS_UZ] || newStatus}" ga o'zgartirildi.`);

    // Build updated message with next actions
    let nextMarkup: InlineKeyboardMarkup | undefined;
    if (newStatus === "accepted") {
      nextMarkup = {
        inline_keyboard: [
          [{ text: "📦 Tayyorlanmoqda", callback_data: `order_status:${orderId}:preparing` }],
          [{ text: "❌ Bekor qilish", callback_data: `order_status:${orderId}:cancelled` }],
        ],
      };
    } else if (newStatus === "preparing") {
      nextMarkup = {
        inline_keyboard: [
          [{ text: "🚚 Kuryerga berildi (Yuborildi)", callback_data: `order_status:${orderId}:shipped` }],
        ],
      };
    } else if (newStatus === "shipped") {
      nextMarkup = {
        inline_keyboard: [
          [{ text: "✅ Yetkazildi (Tugatildi)", callback_data: `order_status:${orderId}:delivered` }],
        ],
      };
    }

    if (messageId && cb.message?.text) {
      const updatedText = cb.message.text + `\n\n<b>YANGILANDI:</b> Holati <i>${ORDER_STATUS_UZ[newStatus as keyof typeof ORDER_STATUS_UZ] || newStatus}</i> ga o'zgartirildi.`;
      await editTelegramMessageText("seller", chatId, messageId, updatedText, nextMarkup);
    }

    // Notify Customer on their Customer bot if customer has telegram_chat_id
    const { data: customerProfile } = await admin
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", order.customer_id)
      .single();

    if (customerProfile?.telegram_chat_id) {
      const statusText = ORDER_STATUS_UZ[newStatus as keyof typeof ORDER_STATUS_UZ] || newStatus;
      await enqueueTelegramNotification({
        botType: "customer",
        chatId: customerProfile.telegram_chat_id,
        payload: {
          text: `📦 <b>Buyurtmangiz holati yangilandi!</b>\n\n` +
            `Buyurtma raqami: <b>${order.order_number}</b>\n` +
            `Do'kon: <b>${storeObj?.name || "Do'kon"}</b>\n` +
            `Yangi holati: <b>${statusText}</b>\n\n` +
            `Xaridingiz uchun tashakkur!`,
          reply_markup: {
            inline_keyboard: [
              [{ text: "📦 Buyurtmani ko'rish", web_app: { url: `${TELEGRAM_CONFIG.siteUrl}/xaridor/buyurtmalar` } }],
            ],
          },
        },
      });
    }
  }
}
