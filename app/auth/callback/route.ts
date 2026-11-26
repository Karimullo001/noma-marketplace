import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/xaridor";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDesc = requestUrl.searchParams.get("error_description");

  // Determine authoritative public origin (respects Vercel reverse proxy)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const publicOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  const isProduction = process.env.NODE_ENV === "production";

  // Handle direct OAuth error from provider (e.g. user canceled Google consent)
  if (errorParam) {
    console.error("[Auth Callback] Provider returned error:", errorParam, errorDesc);
    const targetUrl = new URL("/xaridor/kirish", publicOrigin);
    targetUrl.searchParams.set("error", "oauth_denied");
    if (errorDesc) targetUrl.searchParams.set("desc", errorDesc);
    return NextResponse.redirect(targetUrl);
  }

  if (!code) {
    console.error("[Auth Callback] Missing authorization code in query params");
    const targetUrl = new URL("/xaridor/kirish", publicOrigin);
    targetUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(targetUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Auth Callback] Missing Supabase environment variables on server");
    const targetUrl = new URL("/xaridor/kirish", publicOrigin);
    targetUrl.searchParams.set("error", "supabase_not_configured");
    return NextResponse.redirect(targetUrl);
  }

  // Safe relative redirect destination
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/xaridor";
  const redirectTarget = new URL(safeNext, publicOrigin);

  // Initialize redirect response FIRST so cookies are explicitly bound to its Set-Cookie header
  const response = NextResponse.redirect(redirectTarget);

  // Create Supabase SSR client directly bound to the outgoing response cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            path: options?.path ?? "/",
            sameSite: options?.sameSite ?? "lax",
            secure: isProduction,
          });
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    const errorMsg = error?.message || "Unknown exchange error";
    const errorStatus = error?.status || 400;
    console.error(`[Auth Callback] exchangeCodeForSession failed (${errorStatus}): ${errorMsg}`);

    let errCode = "exchange_failed";
    if (errorMsg.toLowerCase().includes("code verifier") || errorMsg.toLowerCase().includes("pkce")) {
      errCode = "pkce_verifier_missing";
    } else if (errorMsg.toLowerCase().includes("expired")) {
      errCode = "code_expired";
    }

    const failureUrl = new URL(
      next.startsWith("/admin") ? "/admin/kirish" : next.startsWith("/sotuvchi") ? "/sotuvchi/kirish" : "/xaridor/kirish",
      publicOrigin
    );
    failureUrl.searchParams.set("error", errCode);
    return NextResponse.redirect(failureUrl);
  }

  const user = data.user;
  console.log(`[Auth Callback] Session created successfully for user: ${user.id} (${user.email || "no-email"})`);

  // Sync admin role exclusively from ADMIN_EMAILS server-side env var
  const adminClient = createAdminSupabaseClient();
  if (adminClient && user.email && isAdminEmail(user.email)) {
    try {
      await adminClient
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || "NOMA Admin",
          avatar_url: user.user_metadata?.avatar_url || null,
          role: "admin",
        });

      if (next.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/admin", publicOrigin));
      }
    } catch (adminErr) {
      console.error("[Auth Callback] Failed to upsert admin profile:", adminErr);
    }
  }

  // If user signed in via /admin/kirish but is not in ADMIN_EMAILS, reject admin cabinet
  if (next.startsWith("/admin") && !isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    const notAdminUrl = new URL("/admin/kirish", publicOrigin);
    notAdminUrl.searchParams.set("error", "not_admin");
    return NextResponse.redirect(notAdminUrl);
  }

  return response;
}
