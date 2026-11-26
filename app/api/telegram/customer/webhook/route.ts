import { NextRequest, NextResponse } from "next/server";
import { TELEGRAM_CONFIG } from "@/lib/telegram/config";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPrice, formatDateTashkent, ORDER_STATUS_UZ } from "@/lib/utils";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();
    const message = update.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const from = message.from;
    const text = message.text.trim();
    const siteUrl = TELEGRAM_CONFIG.siteUrl;

    if (text.startsWith("/start")) {
      const firstName = from?.first_name || "Hurmatli mijoz";

      await sendTelegramMessage("customer", chatId, {
        text: `Assalomu alaykum, <b>${firstName}</b>! 🛍️\n\n<b>NOMA</b> — Namangan shahrining moda va kiyim-kechak marketpleysiga xush kelibsiz.\n\nUyingizdan chiqmasdan turib shahrimizdagi eng yaxshi do'konlarning real ombor qoldiqlari, o'lchamlari va narxlarini ko'ring hamda kuryer orqali buyurtma bering!`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🛍️ Do'konni ochish (Mini App)",
                web_app: { url: `${siteUrl}/xaridor/tg` },
              },
            ],
            [
              {
                text: "🌐 Sayt orqali kirish",
                url: `${siteUrl}/xaridor`,
              },
            ],
            [
              {
                text: "📦 Buyurtmalarim",
                callback_data: "my_orders",
              },
              {
                text: "ℹ️ Yordam",
                callback_data: "help",
              },
            ],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (text === "/buyurtmalar") {
      await sendCustomerOrders(chatId, from?.id);
      return NextResponse.json({ ok: true });
    }

    if (text === "/yordam") {
      await sendCustomerHelp(chatId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[Telegram Customer Webhook] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    bot: "customer",
    username: TELEGRAM_CONFIG.customerBotUsername,
    status: "active",
  });
}

async function sendCustomerOrders(chatId: string | number, telegramId?: number) {
  if (!telegramId) {
    await sendTelegramMessage("customer", chatId, {
      text: "Foydalanuvchi aniqlanmadi.",
    });
    return;
  }

  const admin = createAdminSupabaseClient();
  if (!admin) {
    await sendTelegramMessage("customer", chatId, {
      text: "Tizim ma'lumotlar bazasi vaqtincha mavjud emas.",
    });
    return;
  }

  // Find linked customer profile
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("telegram_id", telegramId.toString())
    .single();

  if (!profile) {
    await sendTelegramMessage("customer", chatId, {
      text: "Siz hali NOMA akkauntingizni ulamagansiz. Iltimos, do'konni ochish tugmasi orqali kiring.",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🛍️ Do'konni ochish",
              web_app: { url: `${TELEGRAM_CONFIG.siteUrl}/xaridor/tg` },
            },
          ],
        ],
      },
    });
    return;
  }

  const { data: orders } = await admin
    .from("orders")
    .select("id, order_number, total_amount, status, created_at, store:stores(name)")
    .eq("customer_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!orders || orders.length === 0) {
    await sendTelegramMessage("customer", chatId, {
      text: `Hurmatli <b>${profile.full_name || "mijoz"}</b>, sizda hali buyurtmalar mavjud emas.\n\nKiyim-kechaklarni ko'rish va xarid qilish uchun quyidagi tugmani bosing:`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🛍️ Do'konni ochish",
              web_app: { url: `${TELEGRAM_CONFIG.siteUrl}/xaridor/tg` },
            },
          ],
        ],
      },
    });
    return;
  }

  let text = `📦 <b>Oxirgi buyurtmalaringiz:</b>\n\n`;
  for (const o of orders) {
    const statusUz = ORDER_STATUS_UZ[o.status as keyof typeof ORDER_STATUS_UZ] || o.status;
    const storeObj = o.store as unknown as { name?: string };
    const storeName = storeObj?.name || "Do'kon";
    text += `• <b>${o.order_number}</b> (${storeName})\n`;
    text += `  Holati: <i>${statusUz}</i>\n`;
    text += `  Summa: <b>${formatPrice(o.total_amount)}</b>\n`;
    text += `  Sana: ${formatDateTashkent(o.created_at)}\n\n`;
  }

  await sendTelegramMessage("customer", chatId, {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🛍️ Barcha buyurtmalarni ko'rish",
            web_app: { url: `${TELEGRAM_CONFIG.siteUrl}/xaridor/buyurtmalar` },
          },
        ],
      ],
    },
  });
}

async function sendCustomerHelp(chatId: string | number) {
  const text = `ℹ️ <b>NOMA Marketplace Yordam Markazi</b>\n\n` +
    `• <b>NOMA nima?</b> — Namangan shahridagi barcha kiyim-kechak, poyabzal va aksessuar do'konlarini birlashtirgan birinchi moda marketpleysi.\n` +
    `• <b>Yetkazib berish:</b> Har bir do'kon o'z kuryeri orqali mahsulotni eshigingizgacha yetkazib beradi.\n` +
    `• <b>To'lov:</b> Buyurtmani qabul qilib olganingizdan keyin naqd yoki karta orqali to'lanadi.\n` +
    `• <b>Murojaat uchun:</b> @nomaadmin_bot`;

  await sendTelegramMessage("customer", chatId, { text });
}
