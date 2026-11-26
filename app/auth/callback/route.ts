import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/config";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/xaridor";

  if (!code) {
    return NextResponse.redirect(new URL("/xaridor/kirish?error=missing_code", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/xaridor/kirish?error=supabase_not_configured", requestUrl.origin));
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/xaridor/kirish?error=auth_failed", requestUrl.origin));
  }

  const user = data.user;
  const adminClient = createAdminSupabaseClient();

  // Sync admin role exclusively from ADMIN_EMAILS server-side env var
  if (adminClient && user.email && isAdminEmail(user.email)) {
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
      return NextResponse.redirect(new URL("/admin", requestUrl.origin));
    }
  }

  // If signing in via /admin/kirish without being in ADMIN_EMAILS, deny admin access
  if (next.startsWith("/admin") && !isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/kirish?error=not_admin", requestUrl.origin));
  }

  // Safe relative redirect only
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/xaridor";
  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
