/**
 * NOMA Telegram Bots Configuration
 * Read credentials strictly from environment variables.
 */

export const TELEGRAM_CONFIG = {
  // Bot Tokens
  customerBotToken: process.env.TELEGRAM_CUSTOMER_BOT_TOKEN || "",
  sellerBotToken: process.env.TELEGRAM_SELLER_BOT_TOKEN || "",
  adminBotToken: process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "",

  // Bot Usernames
  customerBotUsername: "noma_marketbot",
  sellerBotUsername: "noma_sotuvchibot",
  adminBotUsername: "nomaadmin_bot",

  // Admin Chat IDs (strictly protected, supports multiple admins)
  adminChatId: (process.env.TELEGRAM_ADMIN_CHAT_ID || "7121005635,8826379163").split(",")[0].trim(),
  adminChatIds: (process.env.TELEGRAM_ADMIN_CHAT_ID || "7121005635,8826379163").split(",").map(id => id.trim()).filter(Boolean),

  // Webhook secret for request verification
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "noma-telegram-webhook-secret-2026",

  // Base Site URL
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
} as const;

export type BotType = "customer" | "seller" | "admin";

export function getBotToken(botType: BotType): string {
  switch (botType) {
    case "customer":
      return TELEGRAM_CONFIG.customerBotToken;
    case "seller":
      return TELEGRAM_CONFIG.sellerBotToken;
    case "admin":
      return TELEGRAM_CONFIG.adminBotToken;
    default:
      return "";
  }
}

export function isBotConfigured(botType: BotType): boolean {
  return Boolean(getBotToken(botType));
}

export function getAdminChatIds(): string[] {
  return [...TELEGRAM_CONFIG.adminChatIds];
}

export function isAdminChatId(chatId?: string | number | null): boolean {
  if (!chatId) return false;
  const str = chatId.toString().trim();
  return TELEGRAM_CONFIG.adminChatIds.includes(str);
}
