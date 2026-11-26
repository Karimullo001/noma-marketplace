import { NextResponse } from "next/server";
import { APP_CONFIG, getAuthProviderStatus, isServiceRoleConfigured, isTelegramConfigured } from "@/lib/config";

export async function GET() {
  const auth = getAuthProviderStatus();
  return NextResponse.json({
    status: "ok",
    app: APP_CONFIG.brandName,
    city: APP_CONFIG.defaultCity,
    currency: APP_CONFIG.currency,
    timezone: APP_CONFIG.timezone,
    integrations: {
      supabase: auth.supabaseReady,
      serviceRole: isServiceRoleConfigured(),
      telegramBot: isTelegramConfigured(),
      googleAuth: auth.google,
      appleAuth: auth.apple,
      smsAuth: auth.sms,
    },
  });
}
