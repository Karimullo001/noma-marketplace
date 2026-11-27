import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
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

    // Cryptographic validation — try customer token first, then all others
    const validation = validateTelegramWebAppDataMultiToken(
      initData,
      TELEGRAM_CONFIG.customerBotToken,
      86400 // 24 hours max age
    );

    if (!validation.valid || !validation.user) {
      return NextResponse.json(
        { ok: false, error: validation.error || "Imzo noto'g'ri yoki muddati tugagan" },
        { status: 401 }
      );
    }

    const tgUser = validation.user;
    const admin = createAdminSupabaseClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Supabase ma'lumotlar bazasi ulanmagan" },
        { status: 500 }
      );
    }

    const telegramIdStr = tgUser.id.toString();
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "Telegram Foydalanuvchisi";

    // 1. Check if user profile already linked to this telegram_id
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, email, full_name, role, is_suspended")
      .eq("telegram_id", telegramIdStr)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      if (existingProfile.is_suspended) {
        return NextResponse.json(
          { ok: false, error: "Sizning hisobingiz bloklangan" },
          { status: 403 }
        );
      }
      userId = existingProfile.id;

      // Update full name and username if changed
      await admin
        .from("profiles")
        .update({
          full_name: fullName,
          telegram_username: tgUser.username || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
      // 2. Create customer via Supabase Auth Admin
      const dummyEmail = `tg_${telegramIdStr}@telegram.noma.uz`;

      // Check if auth user exists with dummy email
      const { data: userList } = await admin.auth.admin.listUsers();
      const matchedAuth = userList.users.find((u) => u.email === dummyEmail);

      if (matchedAuth) {
        userId = matchedAuth.id;
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: dummyEmail,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            telegram_id: telegramIdStr,
            telegram_username: tgUser.username,
          },
        });

        if (createErr || !newUser.user) {
          throw new Error(createErr?.message || "Auth user yaratishda xatolik");
        }
        userId = newUser.user.id;
      }

      // Upsert profile strictly with 'customer' role (Telegram never grants higher role)
      await admin.from("profiles").upsert(
        {
          id: userId,
          email: dummyEmail,
          full_name: fullName,
          role: "customer",
          telegram_id: telegramIdStr,
          telegram_username: tgUser.username || null,
          is_suspended: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    // 3. Generate a direct custom session for this customer using magic link or admin token
    // We sign in the user via createServerClient cookie
    const cookieStore = cookies();
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: `tg_${telegramIdStr}@telegram.noma.uz`,
    });

    let sessionEstablished = false;

    if (linkData?.properties?.hashed_token) {
      const supabaseServer = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {}
            },
          },
        }
      );

      const verifyRes = await supabaseServer.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

      if (!verifyRes.error) {
        sessionEstablished = true;
      }
    }

    return NextResponse.json({
      ok: true,
      userId,
      role: "customer",
      fullName,
      sessionEstablished,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[Telegram WebApp Auth] Error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
