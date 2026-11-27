import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { TELEGRAM_CONFIG } from "@/lib/telegram/config";
import { validateTelegramWebAppDataMultiToken } from "@/lib/telegram/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData } = body;

    if (!initData) {
      return NextResponse.json({ ok: false, error: "initData mavjud emas" }, { status: 400 });
    }

    const validation = validateTelegramWebAppDataMultiToken(
      initData,
      TELEGRAM_CONFIG.sellerBotToken,
      86400
    );

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { ok: false, error: validation.error || "Telegram imzosi noto'g'ri" },
        { status: 401 }
      );
    }

    const tgUser = validation.user;
    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase ulanmagan" }, { status: 500 });
    }

    // Strict Role Safety: Telegram NEVER grants seller role. Only already-linked active sellers can enter.
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, full_name, role, is_suspended")
      .eq("telegram_id", tgUser.id.toString())
      .maybeSingle();

    if (!profile || profile.role !== "seller") {
      return NextResponse.json(
        {
          ok: false,
          notLinked: true,
          error:
            "Telegram hisobingiz hali tasdiqlangan sotuvchi do'koniga ulanmagan. Avval veb-saytda sotuvchi bo'lib kiring va 'Telegramni ulash' tugmasini bosing.",
        },
        { status: 403 }
      );
    }

    if (profile.is_suspended) {
      return NextResponse.json({ ok: false, error: "Hisobingiz bloklangan" }, { status: 403 });
    }

    // Create a magiclink token hash to mint a real Supabase session for this seller
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email || `seller_${profile.id}@noma.uz`,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return NextResponse.json(
        { ok: false, error: "Sessiya yaratishda xatolik" },
        { status: 500 }
      );
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

    return NextResponse.json({ ok: true, sellerName: profile.full_name });
  } catch (err: unknown) {
    console.error("[Telegram Seller WebApp Auth] Error:", err);
    return NextResponse.json({ ok: false, error: "Server xatoligi" }, { status: 500 });
  }
}
