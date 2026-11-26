import { isTelegramConfigured } from "@/lib/config";

interface TelegramSellerCodePayload {
  applicantName: string;
  applicantEmail: string;
  code: string;
  expiresAtIso: string;
  isRegenerated?: boolean;
}

/**
 * Sends a one-time seller invitation code directly to the admin's private Telegram chat.
 * Never logs or persists the plaintext code.
 */
export async function sendSellerCodeToAdminTelegram(
  payload: TelegramSellerCodePayload
): Promise<{ sent: boolean; error?: string }> {
  if (!isTelegramConfigured()) {
    return {
      sent: false,
      error: "Telegram bot sozlanmagan (TELEGRAM_BOT_TOKEN yoki TELEGRAM_ADMIN_CHAT_ID yetishmayapti).",
    };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID!;

  const tashkentTime = new Intl.DateTimeFormat("uz-Latn-UZ", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const expiryTime = new Intl.DateTimeFormat("uz-Latn-UZ", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(payload.expiresAtIso));

  const heading = payload.isRegenerated
    ? "🔄 *Yangi Sotuvchi Taklif Kodi (Qayta yaratildi)*"
    : "🆕 *Yangi Sotuvchi Arizasi — NOMA*";

  const text = [
    heading,
    "",
    `👤 *Ariza beruvchi:* ${escapeMarkdown(payload.applicantName)}`,
    `📧 *Email:* ${escapeMarkdown(payload.applicantEmail)}`,
    `🕒 *Vaqt (Toshkent):* ${escapeMarkdown(tashkentTime)}`,
    "",
    `🔑 *Bir martalik taklif kodi:* \`${payload.code}\``,
    `⏳ *Amal qilish muddati:* ${escapeMarkdown(expiryTime)} gacha`,
    "",
    "_Ushbu kodni sotuvchiga shaxsan yuboring. Kod faqat 1 marta ishlaydi._",
  ].join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { sent: false, error: `Telegram API xatosi (${res.status}): ${errBody.slice(0, 120)}` };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Telegram serveriga ulanib bo'lmadi",
    };
  }
}

function escapeMarkdown(str: string): string {
  return str.replace(/([_*`\[])/g, "\\$1");
}
