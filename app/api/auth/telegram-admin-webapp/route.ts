import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { TELEGRAM_CONFIG, isAdminChatId } from "@/lib/telegram/config";
import { validateTelegramWebAppData } from "@/lib/telegram/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData } = body;

    if (!initData) {
      return NextResponse.json({ ok: false, error: "initData mavjud emas" }, { status: 400 });
    }

    const validation = validateTelegramWebAppData(
      initData,
      TELEGRAM_CONFIG.adminBotToken,
      86400
    );

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { ok: false, error: validation.error || "Telegram imzosi noto'g'ri" },
        { status: 401 }
      );
    }

    const tgUser = validation.user;

    // Strict Admin Chat ID Guard
    if (!isAdminChatId(tgUser.id)) {
      return NextResponse.json(
        { ok: false, error: "Sizda Administrator ruxsati yo'q." },
        { status: 403 }
      );
    }

    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase ulanmagan" }, { status: 500 });
    }

    // Find an existing admin profile to bind the session
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (!adminProfile?.email) {
      return NextResponse.json(
        { ok: false, error: "Bazadan admin profili topilmadi." },
        { status: 404 }
      );
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: adminProfile.email,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ ok: false, error: "Sessiya yaratilmadi" }, { status: 500 });
    }

    const cookieStore = cookies();
    const isProduction = process.env.NODE_ENV === "production";
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                path: options?.path ?? "/",
                sameSite: options?.sameSite ?? "lax",
                secure: isProduction,
              })
            );
          },
        },
      }
    );

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyErr) {
      return NextResponse.json({ ok: false, error: verifyErr.message }, { status: 401 });
    }

    return NextResponse.json({ ok: true, adminName: adminProfile.full_name });
  } catch (err: unknown) {
    console.error("[Telegram Admin WebApp Auth] Error:", err);
    return NextResponse.json({ ok: false, error: "Server xatoligi" }, { status: 500 });
  }
}
