import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/config";
import type { Profile, Store, UserRole } from "@/types/database";

export interface AuthSessionContext {
  userId: string;
  email: string | null;
  profile: Profile;
  store?: Store | null;
}

/**
 * Server-side authorization guard for API routes and Server Components.
 * Always verifies session via Supabase Auth (never trusts client headers/cookies alone).
 */
export async function getAuthenticatedContext(): Promise<AuthSessionContext | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_suspended) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
  };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<
  | { ok: true; ctx: AuthSessionContext }
  | { ok: false; response: NextResponse }
> {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Avtorizatsiya talab qilinadi. Iltimos tizimga kiring." },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(ctx.profile.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sizda ushbu bo'limga kirish huquqi yo'q." },
        { status: 403 }
      ),
    };
  }

  if (ctx.profile.role === "admin" && !isAdminEmail(ctx.email)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Administrator huquqi ADMIN_EMAILS orqali tasdiqlanmagan." },
        { status: 403 }
      ),
    };
  }

  if (ctx.profile.role === "seller") {
    const supabase = await createServerSupabaseClient();
    const { data: store } = await supabase!
      .from("stores")
      .select("*")
      .eq("seller_id", ctx.userId)
      .maybeSingle();
    ctx.store = (store as Store) ?? null;
  }

  return { ok: true, ctx };
}

export async function writeAuditLog(params: {
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  const adminClient = createAdminSupabaseClient();
  if (!adminClient) return;
  await adminClient.from("audit_logs").insert({
    actor_id: params.actorId,
    actor_email: params.actorEmail,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    details: params.details ?? {},
    ip_address: params.ipAddress ?? null,
  });
}
