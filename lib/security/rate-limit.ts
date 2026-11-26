import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  lockedUntil?: string;
  message?: string;
}

/**
 * DB-backed rate limiting & temporary lockout against brute-force attacks.
 * Works across Vercel serverless invocations.
 */
export async function checkAndIncrementRateLimit(
  adminClient: SupabaseClient,
  key: string,
  options: { maxAttempts: number; windowMinutes: number; lockoutMinutes: number }
): Promise<RateLimitResult> {
  const now = new Date();
  const { data: existing } = await adminClient
    .from("auth_rate_limits")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (existing?.locked_until && new Date(existing.locked_until) > now) {
    return {
      allowed: false,
      remaining: 0,
      lockedUntil: existing.locked_until,
      message: `Juda ko'p noto'g'ri urinish. Iltimos ${options.lockoutMinutes} daqiqadan keyin qayta urinib ko'ring.`,
    };
  }

  const windowStart = existing?.window_started_at ? new Date(existing.window_started_at) : now;
  const windowExpired = now.getTime() - windowStart.getTime() > options.windowMinutes * 60_000;

  const nextAttempts = windowExpired || !existing ? 1 : existing.attempts + 1;
  const shouldLock = nextAttempts > options.maxAttempts;
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + options.lockoutMinutes * 60_000).toISOString()
    : null;

  await adminClient.from("auth_rate_limits").upsert({
    key,
    attempts: nextAttempts,
    window_started_at: windowExpired || !existing ? now.toISOString() : existing.window_started_at,
    locked_until: lockedUntil,
  });

  if (shouldLock) {
    return {
      allowed: false,
      remaining: 0,
      lockedUntil: lockedUntil ?? undefined,
      message: `Urinishlar limiti tugadi. Hisob ${options.lockoutMinutes} daqiqaga vaqtincha bloklandi.`,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.maxAttempts - nextAttempts),
  };
}

export async function resetRateLimit(adminClient: SupabaseClient, key: string): Promise<void> {
  await adminClient.from("auth_rate_limits").delete().eq("key", key);
}
