import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthProviderStatus } from "@/lib/config";
import { smsSendSchema } from "@/lib/validation/schemas";
import { checkAndIncrementRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const authStatus = getAuthProviderStatus();
  if (!authStatus.supabaseReady || !authStatus.sms) {
    return NextResponse.json(
      {
        error:
          "SMS provayderi hali sozlanmagan. Supabase Phone Auth yoki Eskiz.uz sozlamalarini kiriting.",
        code: "PROVIDER_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov formati" }, { status: 400 });
  }

  const parsed = smsSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Telefon raqami noto'g'ri" },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const adminClient = createAdminSupabaseClient();
  if (adminClient) {
    const rl = await checkAndIncrementRateLimit(adminClient, `sms_send:${parsed.data.phone}:${ip}`, {
      maxAttempts: 5,
      windowMinutes: 15,
      lockoutMinutes: 15,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.message }, { status: 429 });
    }
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ulanmagan" }, { status: 503 });
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
  });

  if (error) {
    return NextResponse.json(
      { error: `SMS yuborib bo'lmadi: ${error.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `${parsed.data.phone} raqamiga tasdiqlash kodi yuborildi.`,
  });
}
