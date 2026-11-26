import { getBotToken, type BotType } from "./config";
import type { OutboxPayload, InlineKeyboardMarkup } from "./types";

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
    migrate_to_chat_id?: number;
  };
}

/**
 * Sends a message via Telegram Bot API with error parsing.
 */
export async function sendTelegramMessage(
  botType: BotType,
  chatId: string | number,
  payload: OutboxPayload
): Promise<TelegramApiResponse> {
  const token = getBotToken(botType);
  if (!token) {
    return { ok: false, description: `${botType} bot token is not configured.` };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.text,
        parse_mode: payload.parse_mode || "HTML",
        reply_markup: payload.reply_markup,
        disable_web_page_preview: payload.disable_web_page_preview,
      }),
    });

    const data: TelegramApiResponse = await res.json();
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, description: message };
  }
}

/**
 * Answers a Telegram callback query (removes loading state on button tap).
 */
export async function answerTelegramCallbackQuery(
  botType: BotType,
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<TelegramApiResponse> {
  const token = getBotToken(botType);
  if (!token) return { ok: false, description: "Bot not configured" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
    return await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return { ok: false, description: message };
  }
}

/**
 * Edits an existing message in a Telegram chat (e.g. after button action).
 */
export async function editTelegramMessageText(
  botType: BotType,
  chatId: string | number,
  messageId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<TelegramApiResponse> {
  const token = getBotToken(botType);
  if (!token) return { ok: false, description: "Bot not configured" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      }),
    });
    return await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return { ok: false, description: message };
  }
}
