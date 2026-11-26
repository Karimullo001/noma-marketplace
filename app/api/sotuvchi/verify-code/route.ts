import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyInvitationCodeSchema } from "@/lib/validation/schemas";
import { hashInvitationCode } from "@/lib/security/code-hash";
import { checkAndIncrementRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Avval tizimga kiring." }, { status: 401 });
  }

  if (ctx.profile.role === "admin") {
    return NextResponse.json({ error: "Administrator ushbu sahifadan foydalana olmaydi." }, { status: 403 });
  }

  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server ma'lumotlar bazasi sozlanmagan." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov formati" }, { status: 400 });
  }

  const parsed = verifyInvitationCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Kod formati noto'g'ri" },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rlKey = `verify_code:${ctx.userId}:${ip}`;

  // Strict brute-force protection: max 5 attempts per 15 min, then 30 min lockout
  const rl = await checkAndIncrementRateLimit(adminClient, rlKey, {
    maxAttempts: 5,
    windowMinutes: 15,
    lockoutMinutes: 30,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.message }, { status: 429 });
  }

  const codeHash = hashInvitationCode(parsed.data.code);

  const { data: rpcResult, error: rpcErr } = await adminClient.rpc(
    "redeem_seller_invitation_code",
    {
      p_applicant_id: ctx.userId,
      p_code_hash: codeHash,
    }
  );

  if (rpcErr || !rpcResult) {
    return NextResponse.json(
      { error: "Kodni tekshirishda server xatoligi yuz berdi." },
      { status: 500 }
    );
  }

  if (!rpcResult.success) {
    return NextResponse.json(
      {
        error: rpcResult.message || "Taklif kodi noto'g'ri.",
        remainingAttempts: rl.remaining,
      },
      { status: 400 }
    );
  }

  await resetRateLimit(adminClient, rlKey);

  return NextResponse.json({
    success: true,
    message: rpcResult.message,
    redirectTo: "/sotuvchi/dokon-yaratish",
  });
}
