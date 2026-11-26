import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail, isSupabaseConfigured } from "@/lib/config";

const PUBLIC_CUSTOMER_PREFIXES = [
  "/xaridor/kirish",
  "/xaridor/katalog",
  "/xaridor/mahsulot",
  "/xaridor/dokon",
];

const PRIVATE_CUSTOMER_PREFIXES = [
  "/xaridor/savat",
  "/xaridor/buyurtma",
  "/xaridor/buyurtmalar",
  "/xaridor/sevimlilar",
  "/xaridor/profil",
];

export async function updateSessionAndGuardRoutes(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/xaridor", request.url));
  }

  // Allow auth callback, telegram webhooks, health check, and public API routes
  if (
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/telegram") ||
    pathname === "/xaridor/tg"
  ) {
    return response;
  }

  const isLoginRoute =
    pathname === "/xaridor/kirish" ||
    pathname === "/sotuvchi/kirish" ||
    pathname === "/admin/kirish";

  const isPrivateCustomer = PRIVATE_CUSTOMER_PREFIXES.some((p) => pathname.startsWith(p));
  const isSellerOnboarding = pathname.startsWith("/sotuvchi/ariza") || pathname.startsWith("/sotuvchi/tasdiqlash") || pathname.startsWith("/sotuvchi/dokon-yaratish");
  const isSellerRoute = pathname.startsWith("/sotuvchi") && pathname !== "/sotuvchi/kirish";
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/kirish";

  if (!isSupabaseConfigured()) {
    if (isPrivateCustomer) return NextResponse.redirect(new URL("/xaridor/kirish", request.url));
    if (isSellerRoute) return NextResponse.redirect(new URL("/sotuvchi/kirish", request.url));
    if (isAdminRoute) return NextResponse.redirect(new URL("/admin/kirish", request.url));
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isPrivateCustomer) return NextResponse.redirect(new URL("/xaridor/kirish", request.url));
    if (isSellerRoute) return NextResponse.redirect(new URL("/sotuvchi/kirish", request.url));
    if (isAdminRoute) return NextResponse.redirect(new URL("/admin/kirish", request.url));
    return response;
  }

  // Fetch authoritative role from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_suspended, email")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role || "customer";
  const isSuspended = Boolean(profile?.is_suspended);

  if (isSuspended && !isLoginRoute) {
    return NextResponse.redirect(new URL("/xaridor/kirish?error=suspended", request.url));
  }

  // Strict Backend RBAC across the three cabinets
  if (isAdminRoute) {
    if (role !== "admin" || !isAdminEmail(user.email)) {
      return NextResponse.redirect(new URL("/admin/kirish?error=forbidden", request.url));
    }
  }

  if (isSellerRoute) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (!isSellerOnboarding && role !== "seller") {
      return NextResponse.redirect(new URL("/sotuvchi/ariza", request.url));
    }
  }

  if (isPrivateCustomer && role !== "customer") {
    if (role === "seller") return NextResponse.redirect(new URL("/sotuvchi", request.url));
    if (role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Keep public customer pages accessible cleanly
  if (PUBLIC_CUSTOMER_PREFIXES.some((p) => pathname.startsWith(p))) {
    return response;
  }

  return response;
}
