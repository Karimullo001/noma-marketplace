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
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;

  // Root redirects to customer marketplace
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/xaridor", request.url));
  }

  // Allow auth callback, telegram webhooks, health check, and public API routes cleanly
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
  const isSellerOnboarding =
    pathname.startsWith("/sotuvchi/ariza") ||
    pathname.startsWith("/sotuvchi/tasdiqlash") ||
    pathname.startsWith("/sotuvchi/dokon-yaratish");
  const isSellerRoute = pathname.startsWith("/sotuvchi") && pathname !== "/sotuvchi/kirish";
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/kirish";

  const isProduction = process.env.NODE_ENV === "production";

  // Helper to preserve any refreshed cookies across redirects
  function redirectWithCookies(targetUrl: URL): NextResponse {
    const redirectRes = NextResponse.redirect(targetUrl);
    response.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value, c);
    });
    return redirectRes;
  }

  if (!isSupabaseConfigured()) {
    if (isPrivateCustomer) return redirectWithCookies(new URL("/xaridor/kirish", request.url));
    if (isSellerRoute) return redirectWithCookies(new URL("/sotuvchi/kirish", request.url));
    if (isAdminRoute) return redirectWithCookies(new URL("/admin/kirish", request.url));
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isPrivateCustomer) return redirectWithCookies(new URL("/xaridor/kirish", request.url));
    if (isSellerRoute) return redirectWithCookies(new URL("/sotuvchi/kirish", request.url));
    if (isAdminRoute) return redirectWithCookies(new URL("/admin/kirish", request.url));
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
    return redirectWithCookies(new URL("/xaridor/kirish?error=suspended", request.url));
  }

  // If already logged in, redirect away from login page if no error present
  if (isLoginRoute && !request.nextUrl.searchParams.has("error")) {
    if (pathname === "/xaridor/kirish") {
      return redirectWithCookies(new URL("/xaridor", request.url));
    }
    if (pathname === "/sotuvchi/kirish") {
      if (role === "seller") return redirectWithCookies(new URL("/sotuvchi", request.url));
      return redirectWithCookies(new URL("/sotuvchi/ariza", request.url));
    }
    if (pathname === "/admin/kirish" && role === "admin") {
      return redirectWithCookies(new URL("/admin", request.url));
    }
  }

  // Strict Backend RBAC across the three cabinets
  if (isAdminRoute) {
    if (role !== "admin" || !isAdminEmail(user.email)) {
      return redirectWithCookies(new URL("/admin/kirish?error=forbidden", request.url));
    }
  }

  if (isSellerRoute) {
    if (role === "admin") {
      return redirectWithCookies(new URL("/admin", request.url));
    }
    if (!isSellerOnboarding && role !== "seller") {
      return redirectWithCookies(new URL("/sotuvchi/ariza", request.url));
    }
  }

  if (isPrivateCustomer && role !== "customer") {
    if (role === "seller") return redirectWithCookies(new URL("/sotuvchi", request.url));
    if (role === "admin") return redirectWithCookies(new URL("/admin", request.url));
  }

  return response;
}
