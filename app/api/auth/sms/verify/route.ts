import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthProviderStatus } from "@/lib/config";
import { smsVerifySchema } from "@/lib/validation/schemas";
import { checkAndIncrementRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const authStatus = getAuthProviderStatus();
  if (!authStatus.supabaseReady || !authStatus.sms) {
    return NextResponse.json(
      { error: "SMS provayderi hali sozlanmagan.", code: "PROVIDER_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov formati" }, { status: 400 });
  }

  const parsed = smsVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rlKey = `sms_verify:${parsed.data.phone}:${ip}`;
  const adminClient = createAdminSupabaseClient();

  if (adminClient) {
    const rl = await checkAndIncrementRateLimit(adminClient, rlKey, {
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

  const { data, error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "sms",
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Tasdiqlash kodi noto'g'ri yoki muddati tugagan." },
      { status: 400 }
    );
  }

  if (adminClient) {
    await resetRateLimit(adminClient, rlKey);
    if (parsed.data.fullName) {
      await adminClient
        .from("profiles")
        .update({ full_name: parsed.data.fullName })
        .eq("id", data.user.id);
    }
  }

  return NextResponse.json({ success: true, redirectTo: "/xaridor" });
}
