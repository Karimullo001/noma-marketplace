export const APP_CONFIG = {
  brandName: process.env.NEXT_PUBLIC_APP_NAME || "NOMA",
  defaultCity: process.env.NEXT_PUBLIC_DEFAULT_CITY || "Namangan",
  supportedCities: ["Namangan"] as const, // Architecture supports adding more cities cleanly
  currency: process.env.NEXT_PUBLIC_CURRENCY || "UZS",
  timezone: process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Tashkent",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
} as const;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anon && url.startsWith("https://"));
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getAuthProviderStatus() {
  const supabaseReady = isSupabaseConfigured();
  const eskizReady = Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
  return {
    supabaseReady,
    google: supabaseReady && process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true",
    apple: supabaseReady && process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true",
    sms: supabaseReady && (process.env.NEXT_PUBLIC_AUTH_SMS_ENABLED === "true" || eskizReady),
    eskizConfigured: eskizReady,
  };
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID);
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("sk-"));
}

export function getAdminChatIds(): string[] {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_ID || "7121005635,8826379163";
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

export function isAdminChatId(chatId?: string | number | null): boolean {
  if (!chatId) return false;
  const ids = getAdminChatIds();
  return ids.includes(chatId.toString().trim());
}

export function getSellerCodeExpiryHours(): number {
  const parsed = Number(process.env.SELLER_CODE_EXPIRY_HOURS || 24);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  return admins.includes(email.trim().toLowerCase());
}
